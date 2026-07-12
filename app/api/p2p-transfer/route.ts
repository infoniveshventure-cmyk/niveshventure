import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import WebsiteSettings from "@/models/WebsiteSettings";
import { compareSecret, getSessionFromCookies } from "@/lib/auth-server";

const WALLET_FIELD_MAP: Record<string, { senderField: string; receiverField: string; label: string }> = {
  main: { senderField: "walletBalance", receiverField: "walletBalance", label: "Main Wallet" },
  earnings: { senderField: "earningsWalletBalance", receiverField: "earningsWalletBalance", label: "All Earnings Wallet" },
  daily_returns: { senderField: "dailyReturnsWallet", receiverField: "dailyReturnsWallet", label: "Daily Return Wallet" },
  withdrawal_returns: { senderField: "withdrawalReturnsWallet", receiverField: "withdrawalReturnsWallet", label: "Withdrawal Returns Wallet" },
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ memberId: session.memberId }).select(
    "walletBalance dailyReturnsWallet withdrawalReturnsWallet earningsWalletBalance dailyReturnPending pendingReturnsLevelIncome boosterWalletBalance nivshWalletBalance usdtWalletBalance fullName"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Fetch P2P transfer history (both sent and received)
  const history = await Transaction.find({
    memberId: session.memberId,
    type: { $in: ["p2p_transfer_in", "p2p_transfer_out"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const wallets = [
    { key: "main", label: "Main Wallet", balance: user.walletBalance ?? 0 },
    { key: "earnings", label: "All Earnings Wallet", balance: user.earningsWalletBalance ?? 0 },
    { key: "daily_returns", label: "Daily Return Wallet", balance: user.dailyReturnsWallet ?? 0 },
    { key: "withdrawal_returns", label: "Withdrawal Returns Wallet", balance: user.withdrawalReturnsWallet ?? 0 },
  ];

  const settings = await WebsiteSettings.findOne({ key: "singleton" });

  return NextResponse.json({ wallets, history, p2pEnabled: settings?.p2pEnabled !== false });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const settings = await WebsiteSettings.findOne({ key: "singleton" });
  if (settings && settings.p2pEnabled === false) {
    return NextResponse.json({ error: "P2P Transfers are temporarily disabled." }, { status: 403 });
  }

  try {
    const { receiverId, amount, accessKey, remarks, walletType = "main", receiverWalletType = "main" } = await req.json();
    if (!receiverId || !amount || !accessKey) {
      return NextResponse.json({ error: "Receiver ID, amount and Access Key are required" }, { status: 400 });
    }
    if (receiverId === session.memberId) {
      return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
    }

    const senderWalletInfo = WALLET_FIELD_MAP[walletType];
    const receiverWalletInfo = WALLET_FIELD_MAP[receiverWalletType];
    if (!senderWalletInfo || !receiverWalletInfo) {
      return NextResponse.json({ error: "Invalid wallet type selection" }, { status: 400 });
    }

    await connectDB();
    const sender = await User.findOne({ memberId: session.memberId });
    const receiver = await User.findOne({ memberId: receiverId });
    if (!sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    if (!receiver) return NextResponse.json({ error: "Receiver ID not found" }, { status: 404 });

    const sanitizedAccessKey = typeof accessKey === "string" ? accessKey.trim().toUpperCase() : "";
    const keyValid = await compareSecret(sanitizedAccessKey, sender.accessKeyHash);
    if (!keyValid) return NextResponse.json({ error: "Invalid Access Key" }, { status: 401 });

    const senderBalance = (sender as any)[senderWalletInfo.senderField] ?? 0;
    if (senderBalance < amount) {
      return NextResponse.json({ error: `Insufficient ${senderWalletInfo.label} balance` }, { status: 400 });
    }

    (sender as any)[senderWalletInfo.senderField] = senderBalance - amount;
    (receiver as any)[receiverWalletInfo.receiverField] = ((receiver as any)[receiverWalletInfo.receiverField] ?? 0) + amount;

    await sender.save();
    await receiver.save();

    const remarkNote = remarks ? ` — ${remarks}` : "";

    await Transaction.create({
      memberId: sender.memberId,
      type: "p2p_transfer_out",
      direction: "debit",
      amount,
      currency: "USDT",
      status: "completed",
      walletType,
      note: `To ${receiver.memberId}${remarkNote}`,
      description: `P2P Transfer to ${receiver.fullName} (${receiver.memberId})${remarkNote}`,
      senderMemberId: sender.memberId,
      receiverMemberId: receiver.memberId,
      senderName: sender.fullName,
      receiverName: receiver.fullName,
    });

    await Transaction.create({
      memberId: receiver.memberId,
      type: "p2p_transfer_in",
      direction: "credit",
      amount,
      currency: "USDT",
      status: "completed",
      walletType: receiverWalletType,
      note: `From ${sender.memberId}${remarkNote}`,
      description: `P2P Transfer from ${sender.fullName} (${sender.memberId})${remarkNote}`,
      senderMemberId: sender.memberId,
      receiverMemberId: receiver.memberId,
      senderName: sender.fullName,
      receiverName: receiver.fullName,
    });

    const updatedSenderBalance = walletType === "returns"
      ? (sender.returnsWalletBalance ?? 0) + (sender.dailyReturnPending ?? 0) + (sender.pendingReturnsLevelIncome ?? 0)
      : (sender as any)[senderWalletInfo.senderField];

    return NextResponse.json({
      success: true,
      receiverName: receiver.fullName,
      newSenderBalance: updatedSenderBalance,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Transfer failed" }, { status: 500 });
  }
}
