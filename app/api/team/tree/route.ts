import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/team/tree?rootId=<memberId>
 * Returns a single level of the binary tree for the given root node,
 * along with business stats.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rootId = req.nextUrl.searchParams.get("rootId") || session.memberId;

  await connectDB();

  const rootUser = await User.findOne({ memberId: rootId }).select(
    "memberId fullName rank isActive position sponsorId parentId " +
    "walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment " +
    "leftCurrentBusiness rightCurrentBusiness leftTotalBusiness rightTotalBusiness " +
    "leftCarryForward rightCarryForward totalReferralIncome totalMatchingIncome " +
    "totalReturnsIncome totalLevelIncome totalRewardIncome createdAt profilePhotoUrl"
  );
  if (!rootUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get direct left and right children
  const [leftChild, rightChild] = await Promise.all([
    User.findOne({ parentId: rootId, position: "left" }).select(
      "memberId fullName rank isActive position walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment createdAt profilePhotoUrl"
    ),
    User.findOne({ parentId: rootId, position: "right" }).select(
      "memberId fullName rank isActive position walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance totalInvestment createdAt profilePhotoUrl"
    ),
  ]);

  // Check if children themselves have children (for expand indicators)
  const [leftHasChildren, rightHasChildren] = await Promise.all([
    leftChild ? User.countDocuments({ parentId: leftChild.memberId }) : Promise.resolve(0),
    rightChild ? User.countDocuments({ parentId: rightChild.memberId }) : Promise.resolve(0),
  ]);

  // Count teams under each side
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

  const [leftTeamCount, rightTeamCount] = await Promise.all([
    leftChild ? countDownline(leftChild.memberId) : Promise.resolve(0),
    rightChild ? countDownline(rightChild.memberId) : Promise.resolve(0),
  ]);

  const totalBusiness =
    (rootUser.leftTotalBusiness || 0) + (rootUser.rightTotalBusiness || 0);

  return NextResponse.json({
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
  });
}
