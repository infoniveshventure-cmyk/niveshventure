import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Helper function to count team size under a node
async function countDownline(id: string): Promise<number> {
  let count = 0;
  let frontier = [id];
  while (frontier.length) {
    const children = await User.find({ parentId: { $in: frontier } }).select("memberId");
    count += children.length;
    frontier = children.map((c: any) => c.memberId);
  }
  return count;
}

// Helper to fetch node info with direct left/right details
async function fetchNodeDetails(memberId: string) {
  const rootUser = await User.findOne({ memberId }).select(
    "memberId fullName rank isActive position sponsorId parentId " +
    "walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment " +
    "leftCurrentBusiness rightCurrentBusiness leftTotalBusiness rightTotalBusiness " +
    "leftCarryForward rightCarryForward totalReferralIncome totalMatchingIncome " +
    "totalReturnsIncome totalLevelIncome totalRewardIncome createdAt profilePhotoUrl"
  );
  if (!rootUser) return null;

  const [leftChild, rightChild] = await Promise.all([
    User.findOne({ parentId: memberId, position: "left" }).select(
      "memberId fullName rank isActive position walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment createdAt profilePhotoUrl"
    ),
    User.findOne({ parentId: memberId, position: "right" }).select(
      "memberId fullName rank isActive position walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment createdAt profilePhotoUrl"
    ),
  ]);

  const [leftHasChildren, rightHasChildren] = await Promise.all([
    leftChild ? User.countDocuments({ parentId: leftChild.memberId }) : Promise.resolve(0),
    rightChild ? User.countDocuments({ parentId: rightChild.memberId }) : Promise.resolve(0),
  ]);

  const [leftTeamCount, rightTeamCount] = await Promise.all([
    leftChild ? countDownline(leftChild.memberId) : Promise.resolve(0),
    rightChild ? countDownline(rightChild.memberId) : Promise.resolve(0),
  ]);

  const totalBusiness = (rootUser.leftTotalBusiness || 0) + (rootUser.rightTotalBusiness || 0);

  return {
    node: rootUser,
    left: leftChild
      ? {
          ...leftChild.toObject(),
          hasChildren: leftHasChildren > 0,
          teamCount: leftTeamCount,
        }
      : null,
    right: rightChild
      ? {
          ...rightChild.toObject(),
          hasChildren: rightHasChildren > 0,
          teamCount: rightTeamCount,
        }
      : null,
    stats: {
      leftTeamCount,
      rightTeamCount,
      totalTeam: leftTeamCount + rightTeamCount + (leftChild ? 1 : 0) + (rightChild ? 1 : 0),
      leftCurrentBusiness: rootUser.leftCurrentBusiness || 0,
      rightCurrentBusiness: rootUser.rightCurrentBusiness || 0,
      leftTotalBusiness: rootUser.leftTotalBusiness || 0,
      rightTotalBusiness: rootUser.rightTotalBusiness || 0,
      totalBusiness,
    },
  };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rootId = session.memberId;
  const searchParam = req.nextUrl.searchParams.get("search")?.trim();
  const rootIdParam = req.nextUrl.searchParams.get("rootId") || rootId;

  await connectDB();

  // If searching for a member to highlight and expand path to
  if (searchParam) {
    // Search user by exact memberId or partial name
    const targetUser = await User.findOne({
      $or: [
        { memberId: searchParam },
        { fullName: { $regex: searchParam, $options: "i" } },
      ],
    }).select("memberId parentId fullName");

    if (!targetUser) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Trace parent chain up to rootId (session user)
    const path: string[] = [];
    let currentId: string | null = targetUser.memberId;
    let foundRoot = false;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      path.unshift(currentId); // prepend

      if (currentId === rootId) {
        foundRoot = true;
        break;
      }

      const parentNode = await User.findOne({ memberId: currentId }).select("parentId");
      currentId = parentNode?.parentId || null;
    }

    if (!foundRoot && targetUser.memberId !== rootId) {
      return NextResponse.json({
        error: "Member found but is not in your downline network",
      }, { status: 403 });
    }

    // Pre-fetch node details for all nodes along the path
    const pathNodes: Record<string, any> = {};
    for (const memberId of path) {
      const details = await fetchNodeDetails(memberId);
      if (details) {
        pathNodes[memberId] = details;
      }
    }

    return NextResponse.json({
      searchResult: true,
      targetId: targetUser.memberId,
      path,
      nodes: pathNodes,
    });
  }

  // Regular single node fetch
  const details = await fetchNodeDetails(rootIdParam);
  if (!details) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(details);
}
