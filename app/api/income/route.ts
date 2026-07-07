import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ memberId: session.memberId }).select("walletBalance");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const incomeTypes = [
    "referral_income",
    "matching_income",
    "reward_income",
    "booster_income",
    "returns_income",
    "level_income",
  ];

  // Fetch all income transactions
  const transactions = await Transaction.find({
    memberId: session.memberId,
    type: { $in: incomeTypes },
  }).sort({ createdAt: 1 }).lean(); // Sort oldest to newest to compute running balance correctly

  // Calculate wallet-wise balances, credits, and debits
  const walletBalances: Record<string, number> = {
    referral_income: 0,
    matching_income: 0,
    reward_income: 0,
    booster_income: 0,
    returns_income: 0,
    level_income: 0,
  };

  const walletCredits: Record<string, number> = { ...walletBalances };
  const walletDebits: Record<string, number> = { ...walletBalances };

  let totalCredit = 0;
  let totalDebit = 0;

  // Process transactions chronologically to calculate running balances
  const processedTransactions = transactions.map((tx: any) => {
    const amount = tx.amount || 0;
    const typeKey = tx.type;

    if (tx.direction === "credit") {
      walletBalances[typeKey] = (walletBalances[typeKey] || 0) + amount;
      walletCredits[typeKey] = (walletCredits[typeKey] || 0) + amount;
      totalCredit += amount;
    } else {
      walletBalances[typeKey] = (walletBalances[typeKey] || 0) - amount;
      walletDebits[typeKey] = (walletDebits[typeKey] || 0) + amount;
      totalDebit += amount;
    }

    return {
      ...tx,
      balanceAfter: walletBalances[typeKey] || 0,
    };
  });

  // Reverse back to newest first for UI display
  processedTransactions.reverse();

  return NextResponse.json({
    availableBalance: user.walletBalance || 0,
    totalEarnings: totalCredit,
    totalCredit,
    totalDebit,
    balances: {
      referral: walletBalances.referral_income || 0,
      matching: walletBalances.matching_income || 0,
      reward: walletBalances.reward_income || 0,
      booster: walletBalances.booster_income || 0,
      returns: walletBalances.returns_income || 0,
      level: walletBalances.level_income || 0,
    },
    transactions: processedTransactions,
  });
}
