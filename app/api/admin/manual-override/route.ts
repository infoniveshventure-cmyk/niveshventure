import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import MonthlyClosing from "@/models/MonthlyClosing";
import ManualOverrideLog from "@/models/ManualOverrideLog";
import RewardHistory from "@/models/RewardHistory";
import { requireAdmin } from "@/lib/require-admin";
import { notifyMember } from "@/lib/notification";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET: Dashboard status cards for Manual Override section
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentClosing = await MonthlyClosing.findOne({ month: currentMonth }).lean();

  const lastLog = await ManualOverrideLog.findOne({
    action: { $in: ["release_income", "release_income_bulk", "release_income_user_wise"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const recentLogs = await ManualOverrideLog.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  let pendingManualIncome = 0;
  let releasedManualIncome = 0;

  if (currentClosing) {
    const c = currentClosing as any;

    (c.calculatedIncomes || []).forEach((inc: any) => {
      const fields: Record<string, number> = {
        reward_income: inc.rewardIncome || 0,
        returns_income: inc.monthlyReturns || 0,
        level_income: inc.returnsLevelIncome || 0,
        referral_income: inc.referralIncome || 0,
        matching_income: inc.matchingIncome || 0,
        booster_income: inc.boosterIncome || 0,
      };
      for (const [type, val] of Object.entries(fields)) {
        if ((c.releasedTypes || []).includes(type)) {
          releasedManualIncome += val;
        } else {
          pendingManualIncome += val;
        }
      }
    });
  }

  return NextResponse.json({
    currentMonth,
    closingStatus: (currentClosing as any)?.status || "open",
    manualClosingStatus: (currentClosing as any)?.manualClosingStatus || "active",
    pausedAt: (currentClosing as any)?.pausedAt || null,
    autoReleaseStatus:
      (currentClosing as any)?.status === "closed" ? "completed" : "pending",
    releasedTypes: (currentClosing as any)?.releasedTypes || [],
    pendingManualIncome: Number(pendingManualIncome.toFixed(2)),
    releasedManualIncome: Number(releasedManualIncome.toFixed(2)),
    lastLog: lastLog || null,
    recentLogs,
    lastManualActionBy: (currentClosing as any)?.lastManualActionBy || null,
    lastManualActionAt: (currentClosing as any)?.lastManualActionAt || null,
  });
}

// POST: User-wise manual income release with filters
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { month, incomeTypes, userIds, username, rank, status, isPremium, dateFrom, dateTo } = body;

  if (!month) return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });
  if (!incomeTypes || incomeTypes.length === 0)
    return NextResponse.json({ error: "At least one income type is required" }, { status: 400 });

  const adminUser = await User.findOne({ memberId: session.memberId }).select("fullName memberId").lean();
  const adminName = (adminUser as any)?.fullName || session.memberId;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "";

  const closing = await MonthlyClosing.findOne({ month });
  if (!closing) return NextResponse.json({ error: "No closing record found for this month" }, { status: 404 });
  if (closing.status === "open") return NextResponse.json({ error: "Closing must be started first" }, { status: 400 });
  if (!closing.calculatedIncomes || closing.calculatedIncomes.length === 0)
    return NextResponse.json({ error: "No calculated incomes found" }, { status: 400 });

  // Build user filter
  const userQuery: any = { role: "member" };
  if (username) userQuery.$or = [{ fullName: { $regex: username, $options: "i" } }, { memberId: { $regex: username, $options: "i" } }];
  if (rank) userQuery.rank = rank;
  if (status === "active") userQuery.isActive = true;
  if (status === "inactive") userQuery.isActive = false;
  if (isPremium !== undefined) userQuery.isPremium = isPremium;
  if (dateFrom || dateTo) {
    userQuery.createdAt = {};
    if (dateFrom) userQuery.createdAt.$gte = new Date(dateFrom);
    if (dateTo) userQuery.createdAt.$lte = new Date(dateTo);
  }

  const targetUsers = await User.find(userQuery).select("memberId").lean();
  let targetMemberIds = targetUsers.map((u: any) => u.memberId);
  if (userIds && userIds.length > 0) targetMemberIds = targetMemberIds.filter((id: string) => userIds.includes(id));
  if (targetMemberIds.length === 0) return NextResponse.json({ error: "No matching users found" }, { status: 400 });

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
  const processedMemberIds: string[] = [];

  for (const calc of closing.calculatedIncomes) {
    if (!targetMemberIds.includes(calc.memberId)) continue;
    const user = await User.findOne({ memberId: calc.memberId });
    if (!user) continue;
    let userUpdated = false;

    for (const incomeType of incomeTypes) {
      const field = typeFieldMap[incomeType];
      if (!field) continue;
      const amount = calc[field] || 0;
      if (amount <= 0) continue;

      // Idempotency: skip if already credited
      const existingTx = await Transaction.findOne({
        memberId: calc.memberId,
        type: typeTransactionMap[incomeType],
        referenceId: closing._id.toString(),
      });
      if (existingTx) continue;

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
        note: `User-wise Manual Release - ${incomeType.replace(/_/g, " ")} - ${month}`,
        referenceId: closing._id.toString(),
      });

      if (incomeType === "reward_income") {
        await RewardHistory.updateMany(
          { memberId: user.memberId, status: "pending" },
          { $set: { status: "released", adminRemarks: `User-wise Manual Release ${month}` } }
        );
      }

      notifyMember(
        user.memberId,
        "Income Manually Released 💸",
        `Your ${incomeType.replace(/_/g, " ")} of $${amount.toFixed(2)} for ${month} has been manually released.`,
        "income_released"
      ).catch(() => {});
    }

    if (userUpdated) {
      await user.save();
      usersProcessed++;
      processedMemberIds.push(calc.memberId);
    }
  }

  // Update closing log entries
  for (const incomeType of incomeTypes) {
    if (releaseSummary[incomeType] > 0) {
      closing.releaseLogs.push({
        incomeType,
        releasedBy: `${adminName} (user-wise)`,
        amount: Number((releaseSummary[incomeType] || 0).toFixed(2)),
      });
    }
  }
  closing.lastManualActionBy = session.memberId;
  closing.lastManualActionAt = new Date();
  await closing.save();

  await ManualOverrideLog.create({
    adminId: session.memberId,
    adminName,
    ipAddress: ip,
    userAgent: ua,
    action: "release_income_user_wise",
    incomeTypes,
    month,
    totalAmount: Number(totalReleased.toFixed(2)),
    usersProcessed,
    targetUserIds: processedMemberIds,
    status: "completed",
    completedAt: new Date(),
    metadata: { filters: { username, rank, status, isPremium, dateFrom, dateTo }, releaseSummary },
  });

  return NextResponse.json({
    success: true,
    totalReleased: Number(totalReleased.toFixed(2)),
    usersProcessed,
    releaseSummary,
    processedMemberIds,
  });
}
