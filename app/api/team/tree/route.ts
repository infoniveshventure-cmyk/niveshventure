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

// Fetch node details along with ALL sponsor direct referrals
async function fetchNodeDetails(memberId: string) {
  const rootUser = await User.findOne({ memberId }).select(
    "memberId fullName rank isActive position sponsorId parentId " +
    "walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment " +
    "leftCurrentBusiness rightCurrentBusiness leftTotalBusiness rightTotalBusiness " +
    "leftCarryForward rightCarryForward totalReferralIncome totalMatchingIncome " +
    "totalReturnsIncome totalLevelIncome totalRewardIncome createdAt profilePhotoUrl"
  );
  if (!rootUser) return null;

  // Find all direct referrals of this user (sponsor tree)
  const directs = await User.find({ sponsorId: memberId }).select(
    "memberId fullName rank isActive position walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment createdAt profilePhotoUrl"
  );

  // For each child, check if they have children (for expand indicators) and compute their downline count
  const childrenWithStatus = await Promise.all(
    directs.map(async (child) => {
      const childCount = await User.countDocuments({ sponsorId: child.memberId });
      const teamCount = await countDownline(child.memberId);
      return {
        ...child.toObject(),
        hasChildren: childCount > 0,
        teamCount,
      };
    })
  );

  const leftTeamCount = await countDownline(memberId); // simple team size
  const totalBusiness = (rootUser.leftTotalBusiness || 0) + (rootUser.rightTotalBusiness || 0);

  return {
    node: rootUser,
    children: childrenWithStatus,
    stats: {
      leftTeamCount,
      rightTeamCount: 0,
      totalTeam: leftTeamCount,
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
    }).select("memberId sponsorId fullName");

    if (!targetUser) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Trace sponsor parent chain up to rootId (session user)
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

      const parentNode = await User.findOne({ memberId: currentId }).select("sponsorId");
      currentId = parentNode?.sponsorId || null;
    }

    if (!foundRoot && targetUser.memberId !== rootId) {
      return NextResponse.json({
        error: "Member found but is not in your referral network",
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
