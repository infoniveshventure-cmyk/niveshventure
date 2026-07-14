import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Withdrawal from "@/models/Withdrawal";
import Deposit from "@/models/Deposit";
import Transaction from "@/models/Transaction";
import MonthlyClosing from "@/models/MonthlyClosing";
import { requireAdmin } from "@/lib/require-admin";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalMembers,
    activeMembers,
    inactiveMembers,
    premiumMembers,
    pendingWithdrawals,
    totalWithdrawalsPaidAgg,
    totalWithdrawalsPendingAgg,
    totalDepositsVerifiedAgg,
    totalWalletBalanceAgg,
    todayBusinessAgg,
    totalBusinessVolumeAgg,
    monthlyClosingDoc,
    recentRegistrations,
    recentTransactions,

    // Custom dashboard additions:
    totalNiveshAgg,
    todayActiveInvestmentAgg,
    referralPaidAgg,
    matchingPaidAgg,
    dailyReturnsPaidAgg,
    returnLevelPaidAgg,
    boosterPaidAgg,
    rankRewardPaidAgg,
    companyRevenueAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "member" }),
    User.countDocuments({ role: "member", isActive: true }),
    User.countDocuments({ role: "member", isActive: false }),
    User.countDocuments({ role: "member", isPremium: true }),
    Withdrawal.countDocuments({ status: "pending" }),
    // Approved & completed withdrawals
    Withdrawal.aggregate([
      { $match: { status: { $in: ["completed", "approved"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Pending withdrawals
    Withdrawal.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Verified Deposits
    Deposit.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    User.aggregate([
      { $match: { role: "member" } },
      { $group: { _id: null, total: { $sum: "$walletBalance" } } }
    ]),
    Transaction.aggregate([
      { $match: { type: "investment", createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Transaction.aggregate([
      { $match: { type: "investment" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    MonthlyClosing.findOne().sort({ month: -1 }).lean(),
    User.find({ role: "member" })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("memberId fullName email createdAt isActive"),
    Transaction.find().sort({ createdAt: -1 }).limit(10),

    // Custom dashboard aggregations
    // Total Investment (Total Nivesh) so far
    (await import("@/models/Investment")).default.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Today's active investment
    (await import("@/models/Investment")).default.aggregate([
      { $match: { status: "active", createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Total Referral Income Paid
    Transaction.aggregate([
      { $match: { type: { $in: ["referral_income", "share_reward"] }, direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Total Matching Income Paid
    Transaction.aggregate([
      { $match: { type: "matching_income", direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Total Daily Returns Paid
    Transaction.aggregate([
      { $match: { type: "returns_income", direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Total Return Level Paid
    Transaction.aggregate([
      { $match: { type: "returns_level_income", direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Total Booster Income Paid
    Transaction.aggregate([
      { $match: { type: "booster_income", direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Total Rank Reward Paid
    Transaction.aggregate([
      { $match: { type: "reward_income", direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Company Revenue wallet balance
    (await import("@/models/CompanyWalletTransaction")).default.aggregate([
      { $match: { walletType: "revenue" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  const totalWithdrawals = totalWithdrawalsPaidAgg[0]?.total || 0;
  const totalWithdrawalsPending = totalWithdrawalsPendingAgg[0]?.total || 0;
  const totalDeposits = totalDepositsVerifiedAgg[0]?.total || 0;
  const totalWalletBalance = totalWalletBalanceAgg[0]?.total || 0;
  const todayBusiness = todayBusinessAgg[0]?.total || 0;
  const totalBusinessVolume = totalBusinessVolumeAgg[0]?.total || 0;

  const totalNivesh = totalNiveshAgg[0]?.total || 0;
  const todayActiveInvestment = todayActiveInvestmentAgg[0]?.total || 0;
  const totalReferralPaid = referralPaidAgg[0]?.total || 0;
  const totalMatchingPaid = matchingPaidAgg[0]?.total || 0;
  const totalDailyReturnsPaid = dailyReturnsPaidAgg[0]?.total || 0;
  const totalReturnLevelPaid = returnLevelPaidAgg[0]?.total || 0;
  const totalBoosterPaid = boosterPaidAgg[0]?.total || 0;
  const totalRankRewardPaid = rankRewardPaidAgg[0]?.total || 0;
  const companyRevenue = companyRevenueAgg[0]?.total || 0;

  // Company Main Balance = approved deposits - (approved withdrawals + payouts)
  const totalPayouts = totalReferralPaid + totalMatchingPaid + totalDailyReturnsPaid + totalReturnLevelPaid + totalBoosterPaid + totalRankRewardPaid;
  const companyMainBalance = Number((totalDeposits - (totalWithdrawals + totalPayouts)).toFixed(2));

  // Pending Payouts from unreleased items in monthly closing staging
  let pendingPayouts = 0;
  if (monthlyClosingDoc && monthlyClosingDoc.status === "closing_in_progress") {
    (monthlyClosingDoc.calculatedIncomes || []).forEach((inc: any) => {
      pendingPayouts += (inc.referralIncome || 0) + (inc.matchingIncome || 0) + (inc.boosterIncome || 0) + (inc.rewardIncome || 0) + (inc.returnsLevelIncome || 0) + (inc.monthlyReturns || 0);
    });
  }

  // Visual Analytics mock/calculated data
  const businessGrowth = [
    { name: "Week 1", amount: totalBusinessVolume * 0.2 },
    { name: "Week 2", amount: totalBusinessVolume * 0.4 },
    { name: "Week 3", amount: totalBusinessVolume * 0.7 },
    { name: "Week 4", amount: totalBusinessVolume },
  ];

  const depositsVsWithdrawals = [
    { name: "Deposits", amount: totalDeposits },
    { name: "Withdrawals", amount: totalWithdrawals }
  ];

  const walletDistribution = [
    { name: "Active Wallets", value: activeMembers },
    { name: "Inactive Wallets", value: inactiveMembers }
  ];

  // System Health Indicators
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  // Returns Level Income Stats
  const { getISTDateString } = await import("@/lib/dailyReturn");
  const ReturnsLevelIncome = (await import("@/models/ReturnsLevelIncome")).default;
  const todayStr = getISTDateString();

  const [
    todayCalcLevelAgg,
    pendingLevelAgg,
    creditedLevelAgg,
    eligibleLevelMembersCount,
  ] = await Promise.all([
    ReturnsLevelIncome.aggregate([
      { $match: { calculationDate: todayStr } },
      { $group: { _id: null, total: { $sum: "$calculatedAmount" } } }
    ]),
    ReturnsLevelIncome.aggregate([
      { $match: { status: "Pending" } },
      { $group: { _id: null, total: { $sum: "$calculatedAmount" } } }
    ]),
    ReturnsLevelIncome.aggregate([
      { $match: { status: "Credited" } },
      { $group: { _id: null, total: { $sum: "$calculatedAmount" } } }
    ]),
    User.countDocuments({
      role: "member",
      isActive: true,
      isBlocked: { $ne: true },
      activatedByFreePin: { $ne: true }
    })
  ]);

  const returnsLevelIncomeStats = {
    todayCalculated: todayCalcLevelAgg[0]?.total || 0,
    monthlyPending: pendingLevelAgg[0]?.total || 0,
    totalCredited: creditedLevelAgg[0]?.total || 0,
    eligibleMembers: eligibleLevelMembersCount,
  };

  return NextResponse.json({
    totalMembers,
    activeMembers,
    inactiveMembers,
    premiumMembers,
    totalBusinessVolume,
    todayBusiness,
    totalDeposits,
    totalWithdrawals,
    pendingWithdrawals,
    totalPayouts,
    pendingPayouts,
    totalWalletBalance,
    monthlyClosingStatus: monthlyClosingDoc?.status || "open",
    recentRegistrations,
    recentTransactions,
    returnsLevelIncomeStats,
    
    // Live wallet and dashboard parameters
    totalNivesh,
    todayActiveInvestment,
    totalReferralPaid,
    totalMatchingPaid,
    totalDailyReturnsPaid,
    totalReturnLevelPaid,
    totalBoosterPaid,
    totalRankRewardPaid,
    totalWithdrawalsPaid: totalWithdrawals,
    totalWithdrawalsPending,
    companyRevenue,
    companyMainBalance,

    analytics: {
      businessGrowth,
      depositsVsWithdrawals,
      walletDistribution,
    },
    systemHealth: {
      apiStatus: "healthy",
      dbStatus,
      uptime: process.uptime(),
    },
  });
}
