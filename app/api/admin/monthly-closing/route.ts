import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Investment from "@/models/Investment";
import BusinessHistory from "@/models/BusinessHistory";
import RewardHistory from "@/models/RewardHistory";
import MonthlyClosing from "@/models/MonthlyClosing";
import BusinessRule from "@/models/BusinessRule";
import WebsiteSettings from "@/models/WebsiteSettings";
import ManualOverrideLog from "@/models/ManualOverrideLog";
import { requireAdmin } from "@/lib/require-admin";
import { notifyMember } from "@/lib/notification";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Default returns level percentages for 10 levels
const DEFAULT_RETURNS_LEVELS = [5, 3, 2, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5];

// Helper to get start and end dates of a given month string "YYYY-MM"
function getMonthRange(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

// GET: Fetch closing indicators, status, history
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Find or create current month's closing document
  let currentClosing = await MonthlyClosing.findOne({ month: currentMonthStr });
  if (!currentClosing) {
    currentClosing = await MonthlyClosing.create({
      month: currentMonthStr,
      status: "open",
    });
  }

  // Calculate indicators
  const { startDate, endDate } = getMonthRange(currentMonthStr);

  // Total Business (Sum of investments created this month)
  const monthlyBusinessAgg = await Investment.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalMonthlyBusiness = monthlyBusinessAgg[0]?.total || 0;

  // Next Closing Date is the last day of the current month
  const nextClosingDate = endDate.toISOString();

  // Pending vs Released Income for current closing
  let pendingIncome = 0;
  let releasedIncome = 0;

  if (currentClosing.status !== "open") {
    currentClosing.calculatedIncomes.forEach((inc: any) => {
      const autoReleaseTotal = inc.referralIncome + inc.matchingIncome + inc.boosterIncome;

      // Auto release is released immediately on complete_closing
      const isClosed = currentClosing.status === "closed";

      if (isClosed) {
        releasedIncome += autoReleaseTotal;
      } else {
        pendingIncome += autoReleaseTotal;
      }

      // Manual release types
      if (currentClosing.releasedTypes.includes("reward_income")) {
        releasedIncome += inc.rewardIncome;
      } else {
        pendingIncome += inc.rewardIncome;
      }

      if (currentClosing.releasedTypes.includes("returns_income")) {
        releasedIncome += inc.monthlyReturns;
      } else {
        pendingIncome += inc.monthlyReturns;
      }

      if (currentClosing.releasedTypes.includes("level_income")) {
        releasedIncome += inc.returnsLevelIncome;
      } else {
        pendingIncome += inc.returnsLevelIncome;
      }
    });
  }

  // Get past closings history
  const history = await MonthlyClosing.find({ status: "closed" }).sort({ completedAt: -1 }).limit(50);

  return NextResponse.json({
    status: currentClosing.status,
    currentMonth: currentMonthStr,
    totalMonthlyBusiness,
    pendingIncome,
    releasedIncome,
    nextClosingDate,
    currentClosing,
    history,
  });
}

// POST: Manage closing stages
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  const { action, month, monthlyReturnPercentage, distributionPercentage } = body;

  if (!month) {
    return NextResponse.json({ error: "Month parameter is required (YYYY-MM)" }, { status: 400 });
  }

  await connectDB();

  let closing = await MonthlyClosing.findOne({ month });
  if (!closing) {
    closing = await MonthlyClosing.create({ month, status: "open" });
  }

  // 1. START CLOSING
  if (action === "start_closing") {
    if (closing.status !== "open") {
      return NextResponse.json({ error: "Closing is already started or completed for this month." }, { status: 400 });
    }

    const returnPct = Number(monthlyReturnPercentage || 6);
    const distPct = Number(distributionPercentage !== undefined ? distributionPercentage : 100);

    const minReturnRule = await BusinessRule.findOne({ key: "monthly_returns_min_pct" });
    const maxReturnRule = await BusinessRule.findOne({ key: "monthly_returns_max_pct" });
    const minReturn = minReturnRule ? Number(minReturnRule.value) : 5;
    const maxReturn = maxReturnRule ? Number(maxReturnRule.value) : 7;

    const finalMin = Math.min(minReturn, 5);
    const finalMax = Math.max(maxReturn, 10);

    if (returnPct < finalMin || returnPct > finalMax) {
      return NextResponse.json({ error: `Monthly return percentage must be between ${finalMin}% and ${finalMax}%` }, { status: 400 });
    }

    // Freeze calculations
    closing.status = "closing_in_progress";
    closing.monthlyReturnPercentage = returnPct;
    closing.distributionPercentage = distPct;
    closing.frozenAt = new Date();

    const { startDate, endDate } = getMonthRange(month);

    // Fetch website settings
    const settings = await WebsiteSettings.findOne({ key: "singleton" });

    // Fetch all members
    const members = await User.find({ role: "member" });

    // Staging calculation array
    const stagedIncomes: any[] = [];

    // Setup helper to build a tree list of downline level distances for level commissions
    // Level 1 to 10 helper
    const getDownlineLevels = (sponsorId: string, maxDepth: number = 10) => {
      const levels: { [key: string]: number } = {};
      const queue: { id: string; depth: number }[] = [{ id: sponsorId, depth: 0 }];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        if (depth > 0 && depth <= maxDepth) {
          levels[id] = depth;
        }

        if (depth < maxDepth) {
          // Find direct referrals
          const directDownlines = members.filter((m) => m.sponsorId === id);
          for (const d of directDownlines) {
            queue.push({ id: d.memberId, depth: depth + 1 });
          }
        }
      }
      return levels;
    };

    // Calculate business History for business totals
    const monthlyBusinessAgg = await Investment.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    closing.totalMonthlyBusiness = monthlyBusinessAgg[0]?.total || 0;

    // Loop through each member and compute their staged earnings
    for (const member of members) {
      const memberId = member.memberId;

      // A. Investor Monthly Returns
      // All active investments
      const activeInvestments = await Investment.find({ memberId, status: "active" });
      const totalInvestmentAmount = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
      const rawMonthlyReturns = totalInvestmentAmount * (returnPct / 100);
      const stagedMonthlyReturns = rawMonthlyReturns * (distPct / 100);

      // B. Referral Income (Level 1 to 5 based on Commission Settings)
      let stagedReferralIncome = 0;
      // Find all downline levels up to 5
      const downlineMapL5 = getDownlineLevels(memberId, 5);
      for (const [dId, level] of Object.entries(downlineMapL5)) {
        // Calculate new investments & unlock access renewals of this downline in this month
        const downlineInvestments = await Investment.find({
          memberId: dId,
          createdAt: { $gte: startDate, $lte: endDate },
        });
        const totalDownlineInvestAmount = downlineInvestments.reduce((sum, inv) => sum + inv.amount, 0);

        const downlineRenewals = await BusinessHistory.find({
          memberId: dId,
          kind: "renewal",
          createdAt: { $gte: startDate, $lte: endDate },
        });
        const totalRenewalAmount = downlineRenewals.reduce((sum, r) => sum + r.amount, 0);

        const totalDownlineBusiness = totalDownlineInvestAmount + totalRenewalAmount;

        const ruleKey = `referral_level${level}_pct`;
        const rule = await BusinessRule.findOne({ key: ruleKey });
        const commRate = rule ? Number(rule.value) : 0;
        stagedReferralIncome += totalDownlineBusiness * (commRate / 100);
      }
      stagedReferralIncome = stagedReferralIncome * (distPct / 100);

      // C. Matching Income (Binary Match)
      // Matched Volume = min(leftCurrentBusiness + leftCarryForward, rightCurrentBusiness + rightCarryForward)
      const leftTotal = (member.leftCurrentBusiness || 0) + (member.leftCarryForward || 0);
      const rightTotal = (member.rightCurrentBusiness || 0) + (member.rightCarryForward || 0);
      const matchedVolume = Math.min(leftTotal, rightTotal);
      const matchingRule = await BusinessRule.findOne({ key: "matching_income_pct" });
      let stagedMatchingIncome = 0;
      if (matchingRule) {
        const matchingRate = Number(matchingRule.value) || 0;
        const isPercentageMode = matchingRule.type === "percentage" || matchingRule.unit === "%";
        if (isPercentageMode) {
          stagedMatchingIncome = matchedVolume * (matchingRate / 100) * (distPct / 100);
        } else {
          // Dollar ($) mode
          const activationPrice = member.activatedByFreePin ? 0 : (settings?.pricing?.unlockAccessPrice || 30);
          stagedMatchingIncome = activationPrice > 0 ? (matchedVolume / activationPrice) * matchingRate * (distPct / 100) : 0;
        }
      } else {
        stagedMatchingIncome = matchedVolume * 0.10 * (distPct / 100);
      }

      // D. Booster Income
      // Check if they got any booster reward in this month
      // Or if they qualified but didn't receive it yet.
      // Let's scan for booster transactions in this month
      const boosterTxns = await Transaction.find({
        memberId,
        type: "reward_income",
        createdAt: { $gte: startDate, $lte: endDate },
        note: { $regex: "booster", $options: "i" },
      });
      const stagedBoosterIncome = boosterTxns.reduce((sum, tx) => sum + tx.amount, 0) * (distPct / 100);

      // E. Reward Income
      // Staged from pending RewardHistory entries
      const pendingRewards = await RewardHistory.find({
        memberId,
        status: "pending",
        createdAt: { $gte: startDate, $lte: endDate },
      });
      const stagedRewardIncome = pendingRewards.reduce((sum, r) => sum + r.amount, 0) * (distPct / 100);

      // F. Returns Level Income (10 levels based on monthly returns of downlines)
      // We will calculate this after calculating everyone's monthlyReturns in a second pass or on-the-fly.
      // Since we need the stagedMonthlyReturns of downlines, let's keep a record or calculate on-the-fly.
      // Zero out all commission/business incomes for Free PIN users (Rule 4)
      const isFreePinUser = member.activatedByFreePin === true;

      stagedIncomes.push({
        memberId,
        referralIncome: isFreePinUser ? 0 : Number(stagedReferralIncome.toFixed(2)),
        matchingIncome: isFreePinUser ? 0 : Number(stagedMatchingIncome.toFixed(2)),
        boosterIncome: isFreePinUser ? 0 : Number(stagedBoosterIncome.toFixed(2)),
        rewardIncome: isFreePinUser ? 0 : Number(stagedRewardIncome.toFixed(2)),
        returnsLevelIncome: 0, // Will compute in next step
        monthlyReturns: Number(stagedMonthlyReturns.toFixed(2)),
      });
    }

    // Pass 2: Calculate Returns Level Income (10 levels)
    const stagedIncomeMap = new Map(stagedIncomes.map((si) => [si.memberId, si]));
    for (const si of stagedIncomes) {
      let stagedReturnsLevelIncome = 0;
      const downlineMapL10 = getDownlineLevels(si.memberId, 10);
      for (const [dId, level] of Object.entries(downlineMapL10)) {
        const downlineStaged = stagedIncomeMap.get(dId);
        if (downlineStaged && downlineStaged.monthlyReturns > 0) {
          const ruleKey = `returns_level${level}_pct`;
          const rule = await BusinessRule.findOne({ key: ruleKey });
          const rate = rule ? Number(rule.value) : (DEFAULT_RETURNS_LEVELS[level - 1] || 0);
          stagedReturnsLevelIncome += downlineStaged.monthlyReturns * (rate / 100);
        }
      }
      
      const memberDoc = members.find((m) => m.memberId === si.memberId);
      const isFreePinUser = memberDoc?.activatedByFreePin === true;
      si.returnsLevelIncome = isFreePinUser ? 0 : Number((stagedReturnsLevelIncome * (distPct / 100)).toFixed(2));
    }

    closing.calculatedIncomes = stagedIncomes;
    await closing.save();

    // Broadcast Alert Notifications to all members
    for (const member of members) {
      notifyMember(
        member.memberId,
        "Monthly Closing Started! ⏳",
        `Monthly closing for ${month} has been initialized by the administrator. Income calculations are temporarily frozen.`,
        "monthly_closing_started"
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, closing });
  }

  // 2. COMPLETE CLOSING
  if (action === "complete_closing") {
    if (closing.status !== "closing_in_progress") {
      return NextResponse.json({ error: "Closing must be in progress to complete it." }, { status: 400 });
    }

    closing.status = "closed";
    closing.completedAt = new Date();

    // Automatically Release: Referral Income, Matching Income, Booster Income
    const autoReleaseTypes = ["referral_income", "matching_income", "booster_income"];
    closing.releasedTypes = autoReleaseTypes;

    for (const calc of closing.calculatedIncomes) {
      const user = await User.findOne({ memberId: calc.memberId });
      if (!user) continue;

      // Apply carry forward logic for binary tree matching
      const leftTotal = (user.leftCurrentBusiness || 0) + (user.leftCarryForward || 0);
      const rightTotal = (user.rightCurrentBusiness || 0) + (user.rightCarryForward || 0);
      const matchedVolume = Math.min(leftTotal, rightTotal);

      user.leftCarryForward = leftTotal - matchedVolume;
      user.rightCarryForward = rightTotal - matchedVolume;
      user.leftCurrentBusiness = 0;
      user.rightCurrentBusiness = 0;

      // Credit Referral Income
      if (calc.referralIncome > 0) {
        user.totalReferralIncome = (user.totalReferralIncome || 0) + calc.referralIncome;
        user.walletBalance = (user.walletBalance || 0) + calc.referralIncome;

        await Transaction.create({
          memberId: user.memberId,
          type: "referral_income",
          direction: "credit",
          amount: calc.referralIncome,
          currency: "USDT",
          status: "completed",
          note: `Monthly Referral Income - ${month}`,
          referenceId: closing._id.toString(),
        });
      }

      // Credit Matching Income
      if (calc.matchingIncome > 0) {
        user.totalMatchingIncome = (user.totalMatchingIncome || 0) + calc.matchingIncome;
        user.walletBalance = (user.walletBalance || 0) + calc.matchingIncome;

        await Transaction.create({
          memberId: user.memberId,
          type: "matching_income",
          direction: "credit",
          amount: calc.matchingIncome,
          currency: "USDT",
          status: "completed",
          note: `Monthly Binary Matching Income - ${month}`,
          referenceId: closing._id.toString(),
        });
      }

      // Credit Booster Income
      if (calc.boosterIncome > 0) {
        user.totalRewardIncome = (user.totalRewardIncome || 0) + calc.boosterIncome;
        user.walletBalance = (user.walletBalance || 0) + calc.boosterIncome;

        await Transaction.create({
          memberId: user.memberId,
          type: "reward_income",
          direction: "credit",
          amount: calc.boosterIncome,
          currency: "USDT",
          status: "completed",
          note: `Monthly Booster Income - ${month}`,
          referenceId: closing._id.toString(),
        });
      }

      await user.save();

      // Notify User
      if (calc.referralIncome > 0 || calc.matchingIncome > 0 || calc.boosterIncome > 0) {
        notifyMember(
          user.memberId,
          "Monthly Incomes Released! 💸",
          `Your Auto-Release Incomes (Referral, Matching, Booster) for ${month} have been credited to your wallet.`,
          "income_released"
        ).catch(() => {});
      }
    }

    // Add release logs
    const totalReferralsReleased = closing.calculatedIncomes.reduce((sum: number, c: any) => sum + c.referralIncome, 0);
    const totalMatchingReleased = closing.calculatedIncomes.reduce((sum: number, c: any) => sum + c.matchingIncome, 0);
    const totalBoosterReleased = closing.calculatedIncomes.reduce((sum: number, c: any) => sum + c.boosterIncome, 0);

    if (totalReferralsReleased > 0) {
      closing.releaseLogs.push({
        incomeType: "referral_income",
        releasedBy: "admin",
        amount: totalReferralsReleased,
      });
    }
    if (totalMatchingReleased > 0) {
      closing.releaseLogs.push({
        incomeType: "matching_income",
        releasedBy: "admin",
        amount: totalMatchingReleased,
      });
    }
    if (totalBoosterReleased > 0) {
      closing.releaseLogs.push({
        incomeType: "booster_income",
        releasedBy: "admin",
        amount: totalBoosterReleased,
      });
    }

    await closing.save();

    // Notify all members closing completed
    const allMembers = await User.find({ role: "member" });
    for (const m of allMembers) {
      notifyMember(
        m.memberId,
        "Monthly Closing Completed! ✅",
        `Monthly closing for ${month} has been finalized. Carry-forward values reset and automatic payouts completed.`,
        "monthly_closing_completed"
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, closing });
  }

  // 3. MANUAL RELEASE INCOME
  if (action === "release_income") {
    const { incomeType } = body;
    const allowedManual = ["reward_income", "returns_income", "level_income"];

    if (!allowedManual.includes(incomeType)) {
      return NextResponse.json({ error: "Invalid manual income type for release" }, { status: 400 });
    }

    if (closing.status !== "closed") {
      return NextResponse.json({ error: "Closing must be completed/closed before manual release." }, { status: 400 });
    }

    if (closing.releasedTypes.includes(incomeType)) {
      return NextResponse.json({ error: "This income type has already been released for this month." }, { status: 400 });
    }

    let totalReleased = 0;

    for (const calc of closing.calculatedIncomes) {
      const user = await User.findOne({ memberId: calc.memberId });
      if (!user) continue;

      if (incomeType === "reward_income" && calc.rewardIncome > 0) {
        user.totalRewardIncome = (user.totalRewardIncome || 0) + calc.rewardIncome;
        user.walletBalance = (user.walletBalance || 0) + calc.rewardIncome;
        totalReleased += calc.rewardIncome;

        await Transaction.create({
          memberId: user.memberId,
          type: "reward_income",
          direction: "credit",
          amount: calc.rewardIncome,
          currency: "USDT",
          status: "completed",
          note: `Monthly Reward Payout - ${month}`,
          referenceId: closing._id.toString(),
        });

        // Also release pending RewardHistory statuses
        const { startDate, endDate } = getMonthRange(month);
        await RewardHistory.updateMany(
          { memberId: user.memberId, status: "pending", createdAt: { $gte: startDate, $lte: endDate } },
          { $set: { status: "released", adminRemarks: `Released in Monthly Closing ${month}` } }
        );

        notifyMember(
          user.memberId,
          "Reward Payout Released! 🏆",
          `Your manual monthly reward payout of $${calc.rewardIncome} for ${month} has been released.`,
          "reward_released"
        ).catch(() => {});
      }

      if (incomeType === "returns_income" && calc.monthlyReturns > 0) {
        user.totalReturnsIncome = (user.totalReturnsIncome || 0) + calc.monthlyReturns;
        user.totalInvestmentReturn = (user.totalInvestmentReturn || 0) + calc.monthlyReturns;
        totalReleased += calc.monthlyReturns;

        await Transaction.create({
          memberId: user.memberId,
          type: "returns_income",
          direction: "credit",
          amount: calc.monthlyReturns,
          currency: "USDT",
          status: "completed",
          note: `Monthly Investment Returns - ${month}`,
          referenceId: closing._id.toString(),
        });

        notifyMember(
          user.memberId,
          "Investment Returns Released! 📈",
          `Your monthly investment returns of $${calc.monthlyReturns} for ${month} have been credited.`,
          "returns_released"
        ).catch(() => {});
      }

      if (incomeType === "level_income" && calc.returnsLevelIncome > 0) {
        user.totalLevelIncome = (user.totalLevelIncome || 0) + calc.returnsLevelIncome;
        user.walletBalance = (user.walletBalance || 0) + calc.returnsLevelIncome;
        totalReleased += calc.returnsLevelIncome;

        await Transaction.create({
          memberId: user.memberId,
          type: "level_income",
          direction: "credit",
          amount: calc.returnsLevelIncome,
          currency: "USDT",
          status: "completed",
          note: `Monthly Returns Level Income - ${month}`,
          referenceId: closing._id.toString(),
        });

        notifyMember(
          user.memberId,
          "Returns Level Income Released! 🔗",
          `Your monthly returns level income of $${calc.returnsLevelIncome} for ${month} has been released.`,
          "level_income_released"
        ).catch(() => {});
      }

      await user.save();
    }

    closing.releasedTypes.push(incomeType);
    closing.releaseLogs.push({
      incomeType,
      releasedBy: "admin",
      amount: totalReleased,
    });

    await closing.save();

    return NextResponse.json({ success: true, closing });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Manual Admin Override actions
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { action, month, reason } = body;

  if (!month) {
    return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });
  }

  await connectDB();

  const adminUser = await User.findOne({ memberId: session.memberId }).select("fullName memberId").lean();
  const adminName = (adminUser as any)?.fullName || session.memberId;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "";

  const closing = await MonthlyClosing.findOne({ month });
  if (!closing) {
    return NextResponse.json({ error: "No closing record found for this month" }, { status: 404 });
  }

  // ── 1. PAUSE CLOSING ──────────────────────────────────────────────────────
  if (action === "pause_closing") {
    if (closing.status !== "closing_in_progress") {
      return NextResponse.json({ error: "Can only pause a closing that is in progress" }, { status: 400 });
    }
    if (closing.manualClosingStatus === "paused") {
      return NextResponse.json({ error: "Closing is already paused" }, { status: 400 });
    }

    closing.manualClosingStatus = "paused";
    closing.pausedAt = new Date();
    closing.pauseReason = reason || "Paused by admin";
    closing.lastManualActionBy = session.memberId;
    closing.lastManualActionAt = new Date();
    await closing.save();

    await ManualOverrideLog.create({
      adminId: session.memberId,
      adminName,
      ipAddress: ip,
      userAgent: ua,
      action: "pause_closing",
      month,
      status: "completed",
      completedAt: new Date(),
      metadata: { reason },
    });

    return NextResponse.json({ success: true, message: "Closing paused", closing });
  }

  // ── 2. RESUME CLOSING ─────────────────────────────────────────────────────
  if (action === "resume_closing") {
    if (closing.manualClosingStatus !== "paused") {
      return NextResponse.json({ error: "Closing is not currently paused" }, { status: 400 });
    }

    closing.manualClosingStatus = "active";
    closing.pausedAt = null;
    closing.pauseReason = "";
    closing.lastManualActionBy = session.memberId;
    closing.lastManualActionAt = new Date();
    await closing.save();

    await ManualOverrideLog.create({
      adminId: session.memberId,
      adminName,
      ipAddress: ip,
      userAgent: ua,
      action: "resume_closing",
      month,
      status: "completed",
      completedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Closing resumed", closing });
  }

  // ── 3. CANCEL CLOSING ─────────────────────────────────────────────────────
  if (action === "cancel_closing") {
    if (closing.status === "closed") {
      return NextResponse.json({ error: "Cannot cancel a closing that is already completed" }, { status: 400 });
    }

    // Revert to open
    const prevStatus = closing.status;
    closing.status = "open";
    closing.manualClosingStatus = "cancelled";
    closing.frozenAt = null;
    closing.calculatedIncomes = [];
    closing.pausedAt = null;
    closing.lastManualActionBy = session.memberId;
    closing.lastManualActionAt = new Date();
    await closing.save();

    await ManualOverrideLog.create({
      adminId: session.memberId,
      adminName,
      ipAddress: ip,
      userAgent: ua,
      action: "cancel_closing",
      month,
      status: "completed",
      completedAt: new Date(),
      metadata: { previousStatus: prevStatus, reason },
    });

    // Notify admins
    const admins = await User.find({ role: "admin" }).select("memberId");
    for (const admin of admins) {
      notifyMember(
        admin.memberId,
        "Monthly Closing Cancelled ⚠️",
        `Monthly closing for ${month} has been cancelled by ${adminName}. Reason: ${reason || "N/A"}`,
        "monthly_closing_cancelled"
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, message: "Closing cancelled and reverted to open", closing });
  }

  // ── 4. PREVIEW INCOME ─────────────────────────────────────────────────────
  if (action === "preview_income") {
    const { incomeTypes, userIds } = body;

    if (!closing.calculatedIncomes || closing.calculatedIncomes.length === 0) {
      return NextResponse.json({ error: "No calculated incomes found. Please start closing first." }, { status: 400 });
    }

    const targetTypes: string[] = incomeTypes || ["referral_income", "matching_income", "booster_income", "reward_income", "returns_income", "level_income"];

    const eligibleUsers: any[] = [];
    let totalAmount = 0;
    const totalBusiness = closing.totalMonthlyBusiness || 0;

    const typeFieldMap: Record<string, string> = {
      referral_income: "referralIncome",
      matching_income: "matchingIncome",
      booster_income: "boosterIncome",
      reward_income: "rewardIncome",
      returns_income: "monthlyReturns",
      level_income: "returnsLevelIncome",
    };

    for (const calc of closing.calculatedIncomes) {
      if (userIds && userIds.length > 0 && !userIds.includes(calc.memberId)) continue;

      let userTotal = 0;
      const breakdown: Record<string, number> = {};

      for (const type of targetTypes) {
        // Skip already released types
        if (closing.releasedTypes.includes(type)) continue;
        const field = typeFieldMap[type];
        if (field && calc[field] > 0) {
          userTotal += calc[field];
          breakdown[type] = calc[field];
        }
      }

      if (userTotal > 0) {
        const user = await User.findOne({ memberId: calc.memberId }).select("fullName memberId walletBalance").lean();
        eligibleUsers.push({
          memberId: calc.memberId,
          fullName: (user as any)?.fullName || calc.memberId,
          currentBalance: (user as any)?.walletBalance || 0,
          totalIncome: userTotal,
          breakdown,
        });
        totalAmount += userTotal;
      }
    }

    return NextResponse.json({
      preview: true,
      month,
      targetIncomeTypes: targetTypes,
      eligibleUserCount: eligibleUsers.length,
      totalBusiness,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalWalletCredit: Number(totalAmount.toFixed(2)),
      users: eligibleUsers,
    });
  }

  // ── 5. BULK RELEASE INCOME ────────────────────────────────────────────────
  if (action === "release_income_bulk") {
    const { incomeTypes, userIds } = body;

    if (closing.status !== "closed" && closing.status !== "closing_in_progress") {
      return NextResponse.json({ error: "Closing must be in progress or closed for manual release" }, { status: 400 });
    }

    if (!incomeTypes || incomeTypes.length === 0) {
      return NextResponse.json({ error: "At least one income type must be selected" }, { status: 400 });
    }

    const allowedManual = ["reward_income", "returns_income", "level_income", "referral_income", "matching_income", "booster_income"];
    const invalidTypes = incomeTypes.filter((t: string) => !allowedManual.includes(t));
    if (invalidTypes.length > 0) {
      return NextResponse.json({ error: `Invalid income types: ${invalidTypes.join(", ")}` }, { status: 400 });
    }

    // Check which ones are already released
    const alreadyReleased = incomeTypes.filter((t: string) => closing.releasedTypes.includes(t));
    const toRelease = incomeTypes.filter((t: string) => !closing.releasedTypes.includes(t));

    if (toRelease.length === 0) {
      return NextResponse.json({ error: "All selected income types are already released", alreadyReleased }, { status: 400 });
    }

    const typeFieldMap: Record<string, string> = {
      referral_income: "referralIncome",
      matching_income: "matchingIncome",
      booster_income: "boosterIncome",
      reward_income: "rewardIncome",
      returns_income: "monthlyReturns",
      level_income: "returnsLevelIncome",
    };

    const typeTransactionMap: Record<string, string> = {
      referral_income: "referral_income",
      matching_income: "matching_income",
      booster_income: "reward_income",
      reward_income: "reward_income",
      returns_income: "returns_income",
      level_income: "level_income",
    };

    const typeUserFieldMap: Record<string, string> = {
      referral_income: "totalReferralIncome",
      matching_income: "totalMatchingIncome",
      booster_income: "totalRewardIncome",
      reward_income: "totalRewardIncome",
      returns_income: "totalReturnsIncome",
      level_income: "totalLevelIncome",
    };

    let totalReleased = 0;
    let usersProcessed = 0;
    const releaseSummary: Record<string, number> = {};

    for (const calc of closing.calculatedIncomes) {
      if (userIds && userIds.length > 0 && !userIds.includes(calc.memberId)) continue;

      const user = await User.findOne({ memberId: calc.memberId });
      if (!user) continue;

      let userUpdated = false;

      for (const incomeType of toRelease) {
        const field = typeFieldMap[incomeType];
        const amount = calc[field] || 0;
        if (amount <= 0) continue;

        // Idempotency: check if already released for this user in this month
        const existingTx = await Transaction.findOne({
          memberId: calc.memberId,
          type: typeTransactionMap[incomeType],
          referenceId: closing._id.toString(),
          note: { $regex: month },
        });
        if (existingTx) continue;

        // Credit wallet
        const userField = typeUserFieldMap[incomeType];
        (user as any)[userField] = ((user as any)[userField] || 0) + amount;
        user.walletBalance = (user.walletBalance || 0) + amount;
        totalReleased += amount;
        releaseSummary[incomeType] = (releaseSummary[incomeType] || 0) + amount;
        userUpdated = true;

        await Transaction.create({
          memberId: user.memberId,
          type: typeTransactionMap[incomeType],
          direction: "credit",
          amount,
          currency: "USDT",
          status: "completed",
          note: `Manual Bulk Release - ${incomeType.replace(/_/g, " ")} - ${month}`,
          referenceId: closing._id.toString(),
        });

        // Special: update RewardHistory for reward_income
        if (incomeType === "reward_income") {
          const { startDate, endDate } = getMonthRange(month);
          await RewardHistory.updateMany(
            { memberId: user.memberId, status: "pending", createdAt: { $gte: startDate, $lte: endDate } },
            { $set: { status: "released", adminRemarks: `Manual Release ${month}` } }
          );
        }

        notifyMember(
          user.memberId,
          `Income Released 💸`,
          `Your ${incomeType.replace(/_/g, " ")} of $${amount.toFixed(2)} for ${month} has been manually released by admin.`,
          "income_released"
        ).catch(() => {});
      }

      if (userUpdated) {
        await user.save();
        usersProcessed++;
      }
    }

    // Update closing record
    for (const incomeType of toRelease) {
      if (!closing.releasedTypes.includes(incomeType)) {
        closing.releasedTypes.push(incomeType);
      }
      if (releaseSummary[incomeType] > 0) {
        closing.releaseLogs.push({
          incomeType,
          releasedBy: `${adminName} (manual)`,
          amount: Number(releaseSummary[incomeType].toFixed(2)),
        });
      }
    }
    closing.lastManualActionBy = session.memberId;
    closing.lastManualActionAt = new Date();
    await closing.save();

    // Save audit log
    await ManualOverrideLog.create({
      adminId: session.memberId,
      adminName,
      ipAddress: ip,
      userAgent: ua,
      action: "release_income_bulk",
      incomeTypes: toRelease,
      month,
      totalAmount: Number(totalReleased.toFixed(2)),
      usersProcessed,
      targetUserIds: userIds || [],
      status: "completed",
      completedAt: new Date(),
      metadata: { releaseSummary, alreadyReleased },
    });

    return NextResponse.json({
      success: true,
      totalReleased: Number(totalReleased.toFixed(2)),
      usersProcessed,
      releaseSummary,
      alreadyReleased,
      closing,
    });
  }

  return NextResponse.json({ error: "Invalid override action" }, { status: 400 });
}
