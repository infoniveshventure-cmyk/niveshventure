import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import AdminWalletTransaction from "@/models/AdminWalletTransaction";
import { getSessionFromCookies } from "@/lib/auth-server";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ memberId: session.memberId }).select(
    "walletBalance dailyReturnsWallet withdrawalReturnsWallet returnsWalletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance usdtWalletAddress " +
    "totalReferralIncome totalMatchingIncome totalReturnsIncome totalLevelIncome totalRewardIncome " +
    "totalInvestment totalWithdrawn"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const transactions = await Transaction.find({ memberId: session.memberId })
    .sort({ createdAt: -1 })
    .limit(100);

  // Fetch admin wallet transactions
  const adminTx = await AdminWalletTransaction.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(100);

  // Normalize admin transactions to match regular transaction shape
  const normalizedAdmin = adminTx.map((a: any) => ({
    _id: a._id,
    type: `admin_${a.type}`,
    direction: a.type, // credit or debit
    amount: a.amount,
    currency: "USDT",
    status: "completed",
    note: a.adminRemarks,
    createdAt: a.createdAt,
    isAdmin: true,
    walletType: a.walletType,
    transactionId: a.transactionId,
    adminRemarks: a.adminRemarks,
  }));

  // Merge and sort
  const allTransactions = [
    ...transactions.map((t: any) => ({ ...t.toObject(), isAdmin: false })),
    ...normalizedAdmin,
  ]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 200);

  const totalEarnings =
    (user.totalReferralIncome || 0) +
    (user.totalMatchingIncome || 0) +
    (user.totalReturnsIncome || 0) +
    (user.totalLevelIncome || 0) +
    (user.totalRewardIncome || 0);

  return NextResponse.json({
    wallet: {
      walletBalance: user.walletBalance || 0,
      returnsWalletBalance: user.returnsWalletBalance || 0,
      dailyReturnsWallet: (user as any).dailyReturnsWallet || 0,
      withdrawalReturnsWallet: (user as any).withdrawalReturnsWallet || 0,
      boosterWalletBalance: user.boosterWalletBalance || 0,
      nivshWalletBalance: user.nivshWalletBalance || 0,
      usdtWalletBalance: user.usdtWalletBalance || 0,
      usdtWalletAddress: user.usdtWalletAddress || "",
      totalReferralIncome: user.totalReferralIncome || 0,
      totalMatchingIncome: user.totalMatchingIncome || 0,
      totalReturnsIncome: user.totalReturnsIncome || 0,
      totalLevelIncome: user.totalLevelIncome || 0,
      totalRewardIncome: user.totalRewardIncome || 0,
      totalInvestment: user.totalInvestment || 0,
      totalWithdrawn: user.totalWithdrawn || 0,
    },
    transactions: allTransactions,
    totalEarnings
  });
}
