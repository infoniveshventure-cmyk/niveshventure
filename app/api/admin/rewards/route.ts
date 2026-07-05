import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import RewardRule from "@/models/RewardRule";
import RewardHistory from "@/models/RewardHistory";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { requireAdmin } from "@/lib/require-admin";
import { notifyMember } from "@/lib/notification";

export const dynamic = "force-dynamic";

// GET: List all reward rules and logs
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();
  const url = req.nextUrl;
  const q = url.searchParams.get("q") || "";
  const rewardType = url.searchParams.get("type") || "";
  const status = url.searchParams.get("status") || "";

  // Fetch Rules
  const rules = await RewardRule.find({}).sort({ createdAt: -1 });

  // Fetch Logs with filter
  const query: any = {};
  if (rewardType) query.rewardType = rewardType;
  if (status) query.status = status;
  if (q) {
    query.memberId = { $regex: q, $options: "i" };
  }

  const logs = await RewardHistory.find(query).sort({ createdAt: -1 }).limit(100).lean();

  // Statistics
  const allLogs = await RewardHistory.find({});
  let totalDistributed = 0;
  let pendingCount = 0;
  const uniqueUsers = new Set();

  allLogs.forEach((log) => {
    if (log.status === "released") {
      totalDistributed += log.amount;
    } else if (log.status === "pending") {
      pendingCount += log.amount;
    }
    uniqueUsers.add(log.memberId);
  });

  return NextResponse.json({
    rules,
    logs,
    stats: {
      totalDistributed,
      pendingCount,
      totalUsers: uniqueUsers.size,
    },
  });
}

// POST: Create a new reward rule or release a manual reward
async function creditRewardToUser(user: any, amount: number, type: string, note: string) {
  const isReferralReward = /referral|share/i.test(type);

  user.totalRewardIncome = (user.totalRewardIncome || 0) + amount;
  if (isReferralReward) {
    user.totalReferralIncome = (user.totalReferralIncome || 0) + amount;
  }
  user.walletBalance = (user.walletBalance || 0) + amount;
  await user.save();

  await Transaction.create({
    memberId: user.memberId,
    type: isReferralReward ? "share_reward" : "reward_income",
    direction: "credit",
    amount,
    currency: "USDT",
    status: "completed",
    note,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  const { action, name, type, amount, isPercentage, description, eligibilityConditions, memberId, remarks } = body;

  await connectDB();

  if (action === "create_rule") {
    if (!name || !type || amount === undefined) {
      return NextResponse.json({ error: "Name, type, and amount are required" }, { status: 400 });
    }
    try {
      const rule = await RewardRule.create({
        name,
        type,
        amount,
        isPercentage: !!isPercentage,
        description: description || "",
        eligibilityConditions: eligibilityConditions || "",
      });
      return NextResponse.json({ success: true, rule });
    } catch {
      return NextResponse.json({ error: "Rule type must be unique" }, { status: 400 });
    }
  }

  if (action === "manual_release") {
    if (!memberId || !type || !amount || amount <= 0) {
      return NextResponse.json({ error: "User ID, type, and valid amount are required" }, { status: 400 });
    }

    const user = await User.findOne({ memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await creditRewardToUser(
      user,
      amount,
      type,
      `Admin released reward for ${type.replace(/_/g, " ")}`
    );

    // Create log entry
    const log = await RewardHistory.create({
      memberId,
      rewardType: type,
      amount,
      status: "released",
      adminRemarks: remarks || "Manually released by Admin",
    });

    // Notify user
    notifyMember(
      memberId,
      `Reward Received! 🎁`,
      `You have been awarded $${amount} for "${type.replace(/_/g, " ")}". Status: Released.`,
      "reward_released",
      log._id
    ).catch(() => {});

    return NextResponse.json({ success: true, log });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// PATCH: Edit existing rule or update/cancel reward log status
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  const { action, id, name, amount, isPercentage, isActive, description, eligibilityConditions, status, remarks } = body;

  await connectDB();

  if (action === "edit_rule") {
    if (!id) return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    const rule = await RewardRule.findByIdAndUpdate(
      id,
      {
        name,
        amount,
        isPercentage,
        isActive,
        description,
        eligibilityConditions,
      },
      { new: true }
    );
    return NextResponse.json({ success: true, rule });
  }

  if (action === "update_log") {
    if (!id || !status) return NextResponse.json({ error: "Log ID and status are required" }, { status: 400 });

    const log = await RewardHistory.findById(id);
    if (!log) return NextResponse.json({ error: "Reward log not found" }, { status: 404 });

    if (log.status !== "pending" && status !== log.status) {
      return NextResponse.json({ error: "Only pending rewards can be modified" }, { status: 400 });
    }

    const previousStatus = log.status;
    log.status = status;
    log.adminRemarks = remarks || log.adminRemarks;
    await log.save();

    if (previousStatus === "pending" && status === "released") {
      // Credit user wallet
      const user = await User.findOne({ memberId: log.memberId });
      if (user) {
        await creditRewardToUser(
          user,
          log.amount,
          log.rewardType,
          `Pending reward released for ${log.rewardType.replace(/_/g, " ")}`
        );

        notifyMember(
          log.memberId,
          "Reward Released! 🎁",
          `Your pending reward of $${log.amount} has been released to your wallet.`,
          "reward_released",
          log._id
        ).catch(() => {});
      }
    } else if (previousStatus === "pending" && status === "cancelled") {
      notifyMember(
        log.memberId,
        "Reward Cancelled ⚠️",
        `Your pending reward of $${log.amount} was cancelled. Remarks: ${remarks || "None"}`,
        "reward_cancelled",
        log._id
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, log });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE: Delete a reward rule
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = req.nextUrl;
  const id = url.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

  await connectDB();
  await RewardRule.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
