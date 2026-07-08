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

  const BusinessRule = (await import("@/models/BusinessRule")).default;
  const rule = await BusinessRule.findOne({ key: "min_investment_amount" });
  const minInvestment = rule ? Number(rule.value) : 100;

  return NextResponse.json({
    investments,
    minInvestment,
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
    const { amount, walletType = "main", targetMemberId } = await req.json();
    await connectDB();

    const BusinessRule = (await import("@/models/BusinessRule")).default;
    const rule = await BusinessRule.findOne({ key: "min_investment_amount" });
    const minInvestment = rule ? Number(rule.value) : MIN_INVESTMENT;

    if (!amount || amount < minInvestment) {
      return NextResponse.json({ error: `Minimum investment is $${minInvestment}` }, { status: 400 });
    }

    const walletInfo = WALLET_FIELDS[walletType];
    if (!walletInfo) {
      return NextResponse.json({ error: "Invalid wallet type selected" }, { status: 400 });
    }

    const payer = await User.findOne({ memberId: session.memberId });
    if (!payer) return NextResponse.json({ error: "Payer user not found" }, { status: 404 });

    const currentBalance = (payer as any)[walletInfo.field] ?? 0;
    if (currentBalance < amount) {
      return NextResponse.json({ error: `Insufficient balance in ${walletInfo.label}` }, { status: 400 });
    }

    let targetUser = payer;
    if (targetMemberId && targetMemberId.trim() !== session.memberId) {
      targetUser = await User.findOne({ memberId: targetMemberId.trim() });
      if (!targetUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }
    }

    const lockInEndsAt = new Date();
    lockInEndsAt.setMonth(lockInEndsAt.getMonth() + LOCK_IN_MONTHS);

    const investment = await Investment.create({
      memberId: targetUser.memberId,
      amount,
      lockInEndsAt,
      walletUsed: walletType,
    });

    // Deduct from payer's selected wallet
    (payer as any)[walletInfo.field] = currentBalance - amount;
    await payer.save();

    // Increment target user's total investment volume
    targetUser.totalInvestment = (targetUser.totalInvestment || 0) + amount;
    await targetUser.save();

    // Propagate this investment amount up the entire binary-tree upline chain starting from the target user
    await propagateBusinessUp(targetUser.memberId, amount);

    // Record transactions
    if (targetUser.memberId === payer.memberId) {
      // Self investment
      await Transaction.create({
        memberId: payer.memberId,
        type: "investment",
        direction: "debit",
        amount,
        currency: "USDT",
        walletType,
        status: "completed",
        note: `Nivesh investment using ${walletInfo.label}`,
        referenceId: investment._id.toString(),
      });
    } else {
      // Invest in another account
      // Payer's transaction: Debit
      await Transaction.create({
        memberId: payer.memberId,
        type: "investment",
        direction: "debit",
        amount,
        currency: "USDT",
        walletType,
        status: "completed",
        note: `Invested in another account: ${targetUser.fullName} (${targetUser.memberId}) using ${walletInfo.label}`,
        referenceId: investment._id.toString(),
        senderMemberId: payer.memberId,
        senderName: payer.fullName,
        receiverMemberId: targetUser.memberId,
        receiverName: targetUser.fullName,
      });

      // Target's transaction: Credit
      await Transaction.create({
        memberId: targetUser.memberId,
        type: "investment",
        direction: "credit",
        amount,
        currency: "USDT",
        walletType,
        status: "completed",
        note: `Received investment from ${payer.fullName} (${payer.memberId}) using ${walletInfo.label}`,
        referenceId: investment._id.toString(),
        senderMemberId: payer.memberId,
        senderName: payer.fullName,
        receiverMemberId: targetUser.memberId,
        receiverName: targetUser.fullName,
      });
    }

    await BusinessHistory.create({
      memberId: targetUser.memberId,
      kind: "nivesh",
      amount,
      note: targetUser.memberId === payer.memberId
        ? `Investment using ${walletInfo.label}`
        : `Investment by payer ${payer.fullName} (${payer.memberId})`,
    });

    return NextResponse.json({
      success: true,
      investment: {
        ...investment.toObject(),
        balanceAfter: (payer as any)[walletInfo.field],
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Investment failed" }, { status: 500 });
  }
}
