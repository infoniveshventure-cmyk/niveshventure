import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import BusinessHistory from "@/models/BusinessHistory";
import { getSessionFromCookies } from "@/lib/auth-server";
import { notifyMember } from "@/lib/notification";
import { processActivationIncomes } from "@/lib/binaryMatching";

const RENEWAL_AMOUNT = 30;
const VALIDITY_DAYS = 365;

const WALLET_FIELDS: Record<string, { field: string; label: string }> = {
  main: { field: "walletBalance", label: "Main Wallet" },
  booster: { field: "boosterWalletBalance", label: "Booster Wallet" },
  nivesh: { field: "nivshWalletBalance", label: "Nivesh Wallet" },
  usdt: { field: "usdtWalletBalance", label: "USDT Wallet" },
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  await connectDB();
  const user = await User.findOne({ memberId: session.memberId }).select("isActive accessExpiresAt walletBalance boosterWalletBalance nivshWalletBalance usdtWalletBalance");
  return NextResponse.json({
    isActive: user?.isActive,
    accessExpiresAt: user?.accessExpiresAt,
    wallets: [
      { key: "main", label: "Main Wallet", balance: user?.walletBalance ?? 0 },
      { key: "booster", label: "Booster Wallet", balance: user?.boosterWalletBalance ?? 0 },
      { key: "nivesh", label: "Nivesh Wallet", balance: user?.nivshWalletBalance ?? 0 },
      { key: "usdt", label: "USDT Wallet", balance: user?.usdtWalletBalance ?? 0 },
    ]
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let walletType = "main";
  let targetMemberId = "";
  try {
    const body = await req.json();
    if (body.walletType) walletType = body.walletType;
    if (body.targetMemberId) targetMemberId = body.targetMemberId.trim();
  } catch {}

  const walletInfo = WALLET_FIELDS[walletType];
  if (!walletInfo) {
    return NextResponse.json({ error: "Invalid wallet selected" }, { status: 400 });
  }

  await connectDB();
  const payer = await User.findOne({ memberId: session.memberId });
  if (!payer) return NextResponse.json({ error: "Payer user not found" }, { status: 404 });

  const currentBalance = (payer as any)[walletInfo.field] ?? 0;
  if (currentBalance < RENEWAL_AMOUNT) {
    return NextResponse.json({ error: `Insufficient balance in ${walletInfo.label}.` }, { status: 400 });
  }

  let targetUser = payer;
  if (targetMemberId && targetMemberId !== session.memberId) {
    targetUser = await User.findOne({ memberId: targetMemberId });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
  }

  if (targetUser.isActive) {
    return NextResponse.json({ error: "Target account is already active." }, { status: 400 });
  }

  // Deduct from payer's wallet
  (payer as any)[walletInfo.field] = currentBalance - RENEWAL_AMOUNT;
  await payer.save();

  // Activate target and trigger referral & binary matching automation
  const { accessExpiresAt: newExpiry } = await processActivationIncomes(targetUser.memberId, RENEWAL_AMOUNT);

  // Re-fetch targetUser to get updated expiry and state
  const updatedTargetUser = await User.findOne({ memberId: targetUser.memberId });

  // Create transactions
  if (updatedTargetUser.memberId === payer.memberId) {
    // Self activation
    await Transaction.create({
      memberId: payer.memberId,
      type: "unlock_access",
      direction: "debit",
      amount: RENEWAL_AMOUNT,
      currency: "USDT",
      walletType,
      status: "completed",
      note: `Unlock Access activation using ${walletInfo.label}`,
    });
  } else {
    // Activate another account
    // Payer's transaction: Debit
    await Transaction.create({
      memberId: payer.memberId,
      type: "unlock_access",
      direction: "debit",
      amount: RENEWAL_AMOUNT,
      currency: "USDT",
      walletType,
      status: "completed",
      note: `Activated another account: ${updatedTargetUser.fullName} (${updatedTargetUser.memberId}) using ${walletInfo.label}`,
      senderMemberId: payer.memberId,
      senderName: payer.fullName,
      receiverMemberId: updatedTargetUser.memberId,
      receiverName: updatedTargetUser.fullName,
    });

    // Target's transaction: Credit
    await Transaction.create({
      memberId: updatedTargetUser.memberId,
      type: "unlock_access",
      direction: "credit",
      amount: RENEWAL_AMOUNT,
      currency: "USDT",
      walletType,
      status: "completed",
      note: `Account activated by ${payer.fullName} (${payer.memberId}) using ${walletInfo.label}`,
      senderMemberId: payer.memberId,
      senderName: payer.fullName,
      receiverMemberId: updatedTargetUser.memberId,
      receiverName: updatedTargetUser.fullName,
    });
  }

  await BusinessHistory.create({
    memberId: updatedTargetUser.memberId,
    kind: "renewal",
    amount: RENEWAL_AMOUNT,
    note: updatedTargetUser.memberId === payer.memberId
      ? `Unlock Access activation using ${walletInfo.label}`
      : `Unlock Access activation by ${payer.fullName} (${payer.memberId})`,
  });

  // Notify sponsor that their referral became active (if sponsor exists)
  if (updatedTargetUser.sponsorId) {
    notifyMember(
      updatedTargetUser.sponsorId,
      "Referral Activated! 🎉",
      `Your referral ${updatedTargetUser.memberId} (${updatedTargetUser.fullName}) has just activated their account. Great news for your network!`,
      "referral_joined"
    ).catch(() => {});
  }

  // Notify user of successful activation
  notifyMember(
    updatedTargetUser.memberId,
    updatedTargetUser.memberId === payer.memberId ? "Account Activated Successfully! ✅" : "Account Activated by Sponsor/Payer! ✅",
    updatedTargetUser.memberId === payer.memberId
      ? `Your account has been activated and is valid until ${newExpiry.toLocaleDateString()}. Welcome aboard!`
      : `Your account has been activated by ${payer.fullName} and is valid until ${newExpiry.toLocaleDateString()}.`,
    "account_activation"
  ).catch(() => {});

  if (updatedTargetUser.memberId !== payer.memberId) {
    notifyMember(
      payer.memberId,
      "Account Activated for Another Member! ✅",
      `You successfully activated the account for ${updatedTargetUser.fullName} (${updatedTargetUser.memberId}).`,
      "account_activation"
    ).catch(() => {});
  }

  return NextResponse.json({ success: true, accessExpiresAt: newExpiry });
}
