import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import RewardHistory from "@/models/RewardHistory";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  await checkAndRunAutoRoi();
  const user = await User.findOne({ memberId: session.memberId }).select(
    "-accessKeyHash -loginKeyHash -firebaseUid"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const directCount = await User.countDocuments({ sponsorId: user.memberId });

  // Full downline count via parentId chain (BFS)
  async function countTeamWithBusiness(rootId: string): Promise<{ count: number; activeCount: number; business: number }> {
    let total = 0;
    let activeCount = 0;
    let business = 0;
    let frontier = [rootId];
    while (frontier.length) {
      const children = await User.find({ parentId: { $in: frontier } }).select(
        "memberId isActive walletBalance totalInvestment boosterWalletBalance nivshWalletBalance usdtWalletBalance"
      );
      total += children.length;
      // Sum up all wallet balances as "business value"
      for (const child of children) {
        if (child.isActive) {
          activeCount++;
        }
        business +=
          (child.walletBalance || 0) +
          (child.totalInvestment || 0) +
          (child.boosterWalletBalance || 0) +
          (child.nivshWalletBalance || 0) +
          (child.usdtWalletBalance || 0);
      }
      frontier = children.map((c: any) => c.memberId);
    }
    return { count: total, activeCount, business };
  }

  // Get left and right direct children
  const leftChild = await User.findOne({ parentId: user.memberId, position: "left" }).select("memberId isActive totalInvestment");
  const rightChild = await User.findOne({ parentId: user.memberId, position: "right" }).select("memberId isActive totalInvestment");

  const [leftStats, rightStats] = await Promise.all([
    leftChild ? countTeamWithBusiness(leftChild.memberId) : Promise.resolve({ count: 0, activeCount: 0, business: 0 }),
    rightChild ? countTeamWithBusiness(rightChild.memberId) : Promise.resolve({ count: 0, activeCount: 0, business: 0 }),
  ]);

  const totalTeam = leftStats.count + rightStats.count + (leftChild ? 1 : 0) + (rightChild ? 1 : 0);

  // Left/Right Active Team counts (include the direct child if active, plus active downline)
  const leftActiveTeam = (leftChild && leftChild.isActive ? 1 : 0) + leftStats.activeCount;
  const rightActiveTeam = (rightChild && rightChild.isActive ? 1 : 0) + rightStats.activeCount;

  // Computed business values
  const leftCurrentBusiness = leftStats.business + (leftChild ? leftChild.totalInvestment || 0 : 0);
  const rightCurrentBusiness = rightStats.business + (rightChild ? rightChild.totalInvestment || 0 : 0);

  // Update the user's business fields if they differ
  let needsSave = false;
  if (Math.abs((user.leftCurrentBusiness || 0) - leftCurrentBusiness) > 0.01) {
    user.leftCurrentBusiness = leftCurrentBusiness;
    user.leftTotalBusiness = Math.max(user.leftTotalBusiness || 0, leftCurrentBusiness);
    needsSave = true;
  }
  if (Math.abs((user.rightCurrentBusiness || 0) - rightCurrentBusiness) > 0.01) {
    user.rightCurrentBusiness = rightCurrentBusiness;
    user.rightTotalBusiness = Math.max(user.rightTotalBusiness || 0, rightCurrentBusiness);
    needsSave = true;
  }

  // Real-time rank qualifications progression
  const RANK_RULES = [
    { code: "X1", left: 20, right: 20, reward: 100 },
    { code: "X2", left: 50, right: 50, reward: 300 },
    { code: "X3", left: 100, right: 100, reward: 700 },
    { code: "X4", left: 250, right: 250, reward: 2000 },
    { code: "X5", left: 500, right: 500, reward: 5000 },
  ];

  let highestQualifiedRank = user.rank || "Unranked";
  for (const rank of RANK_RULES) {
    if (leftCurrentBusiness >= rank.left && rightCurrentBusiness >= rank.right) {
      // Check if already rewarded
      const rewardExists = await Transaction.findOne({
        memberId: user.memberId,
        type: "reward_income",
        note: `Rank Reward - ${rank.code}`,
      });
      if (!rewardExists) {
        user.totalRewardIncome = (user.totalRewardIncome || 0) + rank.reward;
        user.walletBalance = (user.walletBalance || 0) + rank.reward;
        highestQualifiedRank = rank.code;

        await Transaction.create({
          memberId: user.memberId,
          type: "reward_income",
          direction: "credit",
          amount: rank.reward,
          currency: "USDT",
          status: "completed",
          note: `Rank Reward - ${rank.code}`,
          description: `Qualified for Rank ${rank.code}`,
        });

        await RewardHistory.create({
          memberId: user.memberId,
          rewardType: "rank_reward",
          amount: rank.reward,
          status: "released",
          adminRemarks: `Rank Reward - ${rank.code}`,
        });

        needsSave = true;
      }
    }
  }

  if (highestQualifiedRank !== user.rank && highestQualifiedRank !== "Unranked") {
    user.rank = highestQualifiedRank;
    needsSave = true;
  }

  if (needsSave) {
    await user.save();
  }

  return NextResponse.json({
    user,
    stats: {
      direct: directCount,
      leftTeam: leftStats.count + (leftChild ? 1 : 0),
      rightTeam: rightStats.count + (rightChild ? 1 : 0),
      leftActiveTeam,
      rightActiveTeam,
      totalTeam,
      leftCurrentBusiness: user.leftCurrentBusiness,
      rightCurrentBusiness: user.rightCurrentBusiness,
      leftTotalBusiness: user.leftTotalBusiness,
      rightTotalBusiness: user.rightTotalBusiness,
      leftCarryForward: user.leftCarryForward,
      rightCarryForward: user.rightCarryForward,
    },
  });
}

async function checkAndRunAutoRoi() {
  try {
    const WebsiteSettings = (await import("@/models/WebsiteSettings")).default;
    const settings = await WebsiteSettings.findOne({ key: "singleton" });
    if (!settings || !settings.roiAutoMode || !settings.roiStartDate) return;

    const scheduledStr = `${settings.roiStartDate}T${settings.roiCreditTime || "00:00"}:00`;
    const scheduledDate = new Date(scheduledStr);
    if (isNaN(scheduledDate.getTime()) || new Date() < scheduledDate) return;

    // Use YYYY-MM as the unique period string
    const period = settings.roiStartDate.slice(0, 7); // e.g. "2026-07"

    const Investment = (await import("@/models/Investment")).default;
    const AuditLog = (await import("@/models/AuditLog")).default;

    const anyRoiExists = await Transaction.findOne({
      type: "returns_income",
      note: `Monthly ROI - ${period}`,
    });
    if (anyRoiExists) return; // Already distributed

    // Load active members and active investments
    const members = await User.find({ role: "member", isActive: true });
    const investments = await Investment.find({ status: "active" }).lean();
    const investMap = new Map<string, number>();
    for (const inv of investments) {
      investMap.set(inv.memberId, (investMap.get(inv.memberId) || 0) + inv.amount);
    }

    const memberMap = new Map<string, any>(members.map((m) => [m.memberId, m]));
    const DEFAULT_RETURNS_LEVELS = [15, 10, 5, 5, 5, 3, 2, 1, 1, 1];
    const levelIncomeCredits: Record<string, number> = {};

    let totalRoiPaid = 0;
    let totalLevelPaid = 0;
    let usersCount = 0;

    for (const member of members) {
      const totalInvested = investMap.get(member.memberId) || 0;
      if (totalInvested <= 0) continue;

      const roiAmount = totalInvested * (settings.roiPercentage / 100);
      if (roiAmount <= 0) continue;

      // Credit member
      member.walletBalance = (member.walletBalance || 0) + roiAmount;
      member.totalReturnsIncome = (member.totalReturnsIncome || 0) + roiAmount;
      await member.save();

      await Transaction.create({
        memberId: member.memberId,
        type: "returns_income",
        direction: "credit",
        amount: roiAmount,
        currency: "USDT",
        status: "completed",
        note: `Monthly ROI - ${period}`,
        description: `Auto-released ${settings.roiPercentage}% Monthly Returns on investment of $${totalInvested}`,
      });

      totalRoiPaid += roiAmount;
      usersCount++;

      // Upline Level Commissions accumulation
      let currentParentId = member.parentId;
      let depth = 1;
      while (currentParentId && depth <= 10) {
        const parent = memberMap.get(currentParentId);
        if (!parent) break;

        if (parent.activatedByFreePin !== true) {
          const rate = DEFAULT_RETURNS_LEVELS[depth - 1] || 0;
          const levelAmt = roiAmount * (rate / 100);
          levelIncomeCredits[parent.memberId] = (levelIncomeCredits[parent.memberId] || 0) + levelAmt;
        }
        currentParentId = parent.parentId;
        depth++;
      }
    }

    // Pass 2: Pay uplines
    for (const [uplineId, levelAmount] of Object.entries(levelIncomeCredits)) {
      if (levelAmount <= 0) continue;

      const upline = memberMap.get(uplineId);
      if (upline) {
        upline.walletBalance = (upline.walletBalance || 0) + levelAmount;
        upline.totalLevelIncome = (upline.totalLevelIncome || 0) + levelAmount;
        await upline.save();

        await Transaction.create({
          memberId: uplineId,
          type: "level_income",
          direction: "credit",
          amount: levelAmount,
          currency: "USDT",
          status: "completed",
          note: `Monthly Level ROI - ${period}`,
          description: `Auto-distributed Returns Level Income for period ${period}`,
        });

        totalLevelPaid += levelAmount;
      }
    }

    // Log the automatic execution
    await AuditLog.create({
      action: "auto_income_distribution",
      actor: "system_scheduler",
      details: `Scheduled Auto ROI distribution executed for period ${period}. Total ROI paid: $${totalRoiPaid.toFixed(2)} to ${usersCount} users. Total Level ROI paid: $${totalLevelPaid.toFixed(2)}.`,
    });

  } catch (err) {
    console.error("Auto ROI execution failed:", err);
  }
}
