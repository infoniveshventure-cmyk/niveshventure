import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { requireAdmin } from "@/lib/require-admin";

/**
 * POST /api/admin/move-user
 * Moves a member to a new position in the binary tree.
 * Validates: new parent exists, slot is free, no cycle (target not a descendant of user).
 * After move: recalculates business stats for old and new ancestor chains.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  const { userId, newParentId, newPosition } = body;

  if (!userId || !newParentId || !newPosition) {
    return NextResponse.json({ error: "userId, newParentId, and newPosition are required" }, { status: 400 });
  }
  if (!["left", "right"].includes(newPosition)) {
    return NextResponse.json({ error: "newPosition must be 'left' or 'right'" }, { status: 400 });
  }
  if (userId === newParentId) {
    return NextResponse.json({ error: "A user cannot be placed under themselves" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ memberId: userId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newParent = await User.findOne({ memberId: newParentId });
  if (!newParent) return NextResponse.json({ error: "New parent not found" }, { status: 404 });

  // Check if the target slot is already occupied
  const slotTaken = await User.findOne({ parentId: newParentId, position: newPosition });
  if (slotTaken) {
    return NextResponse.json(
      { error: `The ${newPosition} slot under ${newParentId} is already occupied by ${slotTaken.memberId}` },
      { status: 409 }
    );
  }

  // Cycle detection: check if newParent is a descendant of the user being moved
  // If yes, moving user there would create a cycle
  let check: string | null = newParentId;
  const visited = new Set<string>();
  let hasCycle = false;
  while (check) {
    if (visited.has(check)) break;
    visited.add(check);
    if (check === userId) {
      hasCycle = true;
      break;
    }
    const node = await User.findOne({ memberId: check }).select("parentId");
    check = node?.parentId || null;
  }
  if (hasCycle) {
    return NextResponse.json(
      { error: "Invalid move: the target parent is a descendant of the user being moved (would create a cycle)" },
      { status: 400 }
    );
  }

  // Store old values for recalculation
  const oldParentId = user.parentId;
  const oldPosition = user.position;

  // --- Snapshot of stats before move for audit ---
  const auditMeta = {
    adminId: guard.session!.memberId,
    userId,
    oldParentId,
    oldPosition,
    newParentId,
    newPosition,
    reason: body.reason || "Admin tree restructure",
  };

  // Execute the move
  user.parentId = newParentId;
  user.position = newPosition;
  await user.save();

  // --- Recalculate business stats for OLD ancestor chain ---
  // Subtract user's business contribution from all old ancestors
  await recalculateChain(oldParentId);

  // --- Recalculate business stats for NEW ancestor chain ---
  // Add user's business contribution to all new ancestors
  await recalculateChain(newParentId);

  // Write audit log
  await AuditLog.create({
    actorId: guard.session!.memberId,
    actorRole: "admin",
    actionType: "user_moved",
    resourceType: "User",
    resourceId: userId,
    targetMemberId: userId,
    severity: "warning",
    metadata: auditMeta,
  });

  return NextResponse.json({
    success: true,
    message: `Member ${userId} moved to ${newPosition} of ${newParentId} successfully`,
    user: { memberId: user.memberId, parentId: user.parentId, position: user.position },
  });
}

/**
 * Recalculate leftCurrentBusiness and rightCurrentBusiness for a node and all its ancestors
 * by doing a full BFS downline count per side.
 */
async function recalculateChain(startMemberId: string | null) {
  let currentId: string | null = startMemberId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const node = await User.findOne({ memberId: currentId });
    if (!node) break;

    // BFS for left and right sides
    const [leftChildren, rightChildren] = await Promise.all([
      User.find({ parentId: currentId, position: "left" }).select("memberId totalInvestment isActive"),
      User.find({ parentId: currentId, position: "right" }).select("memberId totalInvestment isActive"),
    ]);

    const sumDownline = async (rootIds: string[]): Promise<number> => {
      let total = 0;
      let frontier = rootIds;
      while (frontier.length) {
        const children = await User.find({ parentId: { $in: frontier } }).select("memberId totalInvestment");
        for (const c of children) total += c.totalInvestment || 0;
        frontier = children.map((c: any) => c.memberId);
      }
      return total;
    };

    const leftDirectBiz = leftChildren.reduce((s: number, c: any) => s + (c.totalInvestment || 0), 0);
    const rightDirectBiz = rightChildren.reduce((s: number, c: any) => s + (c.totalInvestment || 0), 0);
    const leftDownlineBiz = await sumDownline(leftChildren.map((c: any) => c.memberId));
    const rightDownlineBiz = await sumDownline(rightChildren.map((c: any) => c.memberId));

    const newLeft = leftDirectBiz + leftDownlineBiz;
    const newRight = rightDirectBiz + rightDownlineBiz;

    node.leftCurrentBusiness = newLeft;
    node.rightCurrentBusiness = newRight;
    node.leftTotalBusiness = Math.max(node.leftTotalBusiness || 0, newLeft);
    node.rightTotalBusiness = Math.max(node.rightTotalBusiness || 0, newRight);
    await node.save();

    currentId = node.parentId || null;
  }
}

/**
 * GET /api/admin/move-user?userId=XXX — preview current placement info for a user
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const user = await User.findOne({ memberId: userId }).select(
    "memberId fullName email sponsorId parentId position isActive isBlocked rank"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const parent = user.parentId
    ? await User.findOne({ memberId: user.parentId }).select("memberId fullName")
    : null;

  // Get current slot occupancy of the current parent
  const siblings = user.parentId
    ? await User.find({ parentId: user.parentId }).select("memberId position")
    : [];

  return NextResponse.json({ user, parent, siblings });
}
