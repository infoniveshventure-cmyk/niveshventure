import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-admin";
import Deposit from "@/models/Deposit";
import Withdrawal from "@/models/Withdrawal";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import CompanyWalletTransaction from "@/models/CompanyWalletTransaction";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  // 1. Calculate Company Main Balance
  const [
    depositsAgg,
    withdrawalsAgg,
    payoutsAgg,
    revenueAgg
  ] = await Promise.all([
    // Approved Deposits (status === "verified")
    Deposit.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Completed/Approved Withdrawals
    Withdrawal.aggregate([
      { $match: { status: { $in: ["completed", "approved"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Payouts Paid
    Transaction.aggregate([
      {
        $match: {
          type: {
            $in: [
              "referral_income",
              "matching_income",
              "returns_income",
              "daily_return",
              "level_income",
              "reward_income",
              "booster_income",
              "returns_level_income",
              "share_reward"
            ]
          },
          direction: "credit",
          status: "completed"
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    // Company Revenue Wallet Balance (from CompanyWalletTransaction)
    CompanyWalletTransaction.aggregate([
      { $match: { walletType: "revenue" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  const totalDeposits = depositsAgg[0]?.total || 0;
  const totalWithdrawals = withdrawalsAgg[0]?.total || 0;
  const totalPayouts = payoutsAgg[0]?.total || 0;
  const totalRevenue = revenueAgg[0]?.total || 0;

  const companyMainBalance = Number((totalDeposits - (totalWithdrawals + totalPayouts)).toFixed(2));

  // 2. Fetch history for Company Main Balance
  // Main balance transactions include: approved deposits, approved withdrawals, and payouts.
  // We can query CompanyWalletTransaction for deposits/withdrawals, and Transaction for payouts, and combine them.
  const walletType = req.nextUrl.searchParams.get("walletType") || "main";

  let history: any[] = [];

  if (walletType === "revenue") {
    // Revenue history is fetched straight from CompanyWalletTransaction
    history = await CompanyWalletTransaction.find({ walletType: "revenue" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  } else {
    // Main history: get deposits & withdrawals from CompanyWalletTransaction, and payouts from Transaction
    const [mainLedger, payoutsLedger] = await Promise.all([
      CompanyWalletTransaction.find({ walletType: "main" })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      Transaction.find({
        type: {
          $in: [
            "referral_income",
            "matching_income",
            "returns_income",
            "daily_return",
            "level_income",
            "reward_income",
            "booster_income",
            "returns_level_income",
            "share_reward"
          ]
        },
        direction: "credit",
        status: "completed"
      })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean()
    ]);

    // Fetch user names for payouts ledger since Transaction doesn't have userName
    const payoutMemberIds = payoutsLedger.map((t: any) => t.memberId);
    const users = await User.find({ memberId: { $in: payoutMemberIds } }).select("memberId fullName").lean();
    const userMap = new Map(users.map((u: any) => [u.memberId, u.fullName]));

    const formattedPayouts = payoutsLedger.map((t: any) => ({
      _id: t._id,
      memberId: t.memberId,
      userName: userMap.get(t.memberId) || "Unknown User",
      walletType: "main",
      type: "debit", // payouts are outflow/debit for company
      transactionType: `payout_${t.type}`,
      amount: t.amount,
      description: t.description || t.note || `Payout of type ${t.type.replace(/_/g, " ")} to ${t.memberId}`,
      createdAt: t.createdAt
    }));

    const formattedLedger = mainLedger.map((t: any) => ({
      _id: t._id,
      memberId: t.memberId,
      userName: t.userName,
      walletType: "main",
      type: t.type,
      transactionType: t.transactionType,
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt
    }));

    // Merge and sort by date descending
    history = [...formattedLedger, ...formattedPayouts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200);
  }

  return NextResponse.json({
    companyMainBalance,
    companyRevenueBalance: totalRevenue,
    history
  });
}
