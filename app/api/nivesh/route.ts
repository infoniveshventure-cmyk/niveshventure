import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Investment from "@/models/Investment";
import Transaction from "@/models/Transaction";
import BusinessHistory from "@/models/BusinessHistory";
import { getSessionFromCookies } from "@/lib/auth-server";
import { propagateBusinessUp } from "@/lib/propagateBusinessUp";

const MIN_INVESTMENT = 100;
const LOCK_IN_MONTHS = 11;

const WALLET_FIELDS: Record<string, { field: string; label: string }> = {
  main: { field: "walletBalance", label: "Main Wallet" },
  booster: { field: "boosterWalletBalance", label: "Booster Wallet" },
  nivesh: { field: "nivshWalletBalance", label: "Nivesh Wallet" },
  usdt: { field: "usdtWalletBalance", label: "USDT Wallet" },
};

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  await connectDB();

  const query: any = { memberId: session.memberId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const investments = await Investment.find(query).sort({ createdAt: -1 });

  // Get user details to return current balances
  const user = await User.findOne({ memberId: session.memberId }).select(
    "walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance"
  );

  return NextResponse.json({
    investments,
    wallets: [
      { key: "main", label: "Main Wallet", balance: user?.walletBalance ?? 0 },
      { key: "booster", label: "Booster Wallet", balance: user?.boosterWalletBalance ?? 0 },
      { key: "nivesh", label: "Nivesh Wallet", balance: user?.nivshWalletBalance ?? 0 },
      { key: "usdt", label: "USDT Wallet", balance: user?.usdtWalletBalance ?? 0 },
    ],
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { amount, walletType = "main" } = await req.json();
    if (!amount || amount < MIN_INVESTMENT) {
      return NextResponse.json({ error: `Minimum investment is $${MIN_INVESTMENT}` }, { status: 400 });
    }

    const walletInfo = WALLET_FIELDS[walletType];
    if (!walletInfo) {
      return NextResponse.json({ error: "Invalid wallet type selected" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const currentBalance = (user as any)[walletInfo.field] ?? 0;
    if (currentBalance < amount) {
      return NextResponse.json({ error: `Insufficient balance in ${walletInfo.label}` }, { status: 400 });
    }

    const lockInEndsAt = new Date();
    lockInEndsAt.setMonth(lockInEndsAt.getMonth() + LOCK_IN_MONTHS);

    const investment = await Investment.create({
      memberId: user.memberId,
      amount,
      lockInEndsAt,
      walletUsed: walletType,
    });

    // Deduct from selected wallet and increment total investment volume
    (user as any)[walletInfo.field] = currentBalance - amount;
    user.totalInvestment = (user.totalInvestment || 0) + amount;
    await user.save();

    // Propagate this investment amount up the entire binary-tree upline chain
    // so every ancestor's leftCurrentBusiness / rightCurrentBusiness is updated
    // in the database immediately — no manual refresh needed.
    await propagateBusinessUp(user.memberId, amount);

    const tx = await Transaction.create({
      memberId: user.memberId,
      type: "investment",
      direction: "debit",
      amount,
      currency: "USDT",
      walletType,
      status: "completed",
      note: `Nivesh investment using ${walletInfo.label}`,
      referenceId: investment._id.toString(),
    });

    await BusinessHistory.create({ memberId: user.memberId, kind: "nivesh", amount, note: `Investment using ${walletInfo.label}` });

    return NextResponse.json({
      success: true,
      investment: {
        ...investment.toObject(),
        balanceAfter: (user as any)[walletInfo.field],
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Investment failed" }, { status: 500 });
  }
}
