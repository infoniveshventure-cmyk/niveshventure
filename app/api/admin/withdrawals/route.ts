import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Withdrawal from "@/models/Withdrawal";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import Notice from "@/models/Notice";
import { requireAdmin } from "@/lib/require-admin";
import { notifyMember } from "@/lib/notification";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || "";
  const memberId = searchParams.get("memberId") || "";
  const walletType = searchParams.get("walletType") || ""; // Main, Booster, Returns etc (matching withdrawalKind in our schema)
  const q = searchParams.get("q") || "";

  const query: any = {};
  if (status) query.status = status;
  if (memberId) query.memberId = { $regex: memberId, $options: "i" };
  if (walletType) query.withdrawalKind = walletType;

  // Perform a user join if 'q' search is specified
  if (q) {
    const matchedUsers = await User.find({
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { memberId: { $regex: q, $options: "i" } }
      ]
    }).select("memberId");
    
    const ids = matchedUsers.map(u => u.memberId);
    query.memberId = { $in: ids };
  }

  const withdrawals = await Withdrawal.find(query).sort({ createdAt: -1 }).limit(200);

  // Statistics calculation
  const allWithdrawals = await Withdrawal.find({});
  const totalWithdrawals = allWithdrawals.length;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let totalAmount = 0;

  allWithdrawals.forEach(w => {
    if (w.status === "pending") pendingCount++;
    else if (w.status === "completed" || w.status === "approved") approvedCount++;
    else if (w.status === "rejected") rejectedCount++;
    totalAmount += w.amount;
  });

  return NextResponse.json({ 
    withdrawals,
    stats: {
      totalWithdrawals,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalAmount
    }
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { withdrawalId, action, adminNote } = await req.json();
  if (!withdrawalId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "withdrawalId and valid action are required" }, { status: 400 });
  }

  await connectDB();
  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Withdrawal already processed" }, { status: 400 });
  }

  if (action === "approve") {
    withdrawal.status = "completed";
    const userObj = await User.findOne({ memberId: withdrawal.memberId }).select("fullName");
    const userName = userObj ? userObj.fullName : "Unknown User";

    await User.updateOne({ memberId: withdrawal.memberId }, { $inc: { totalWithdrawn: withdrawal.amount } });
    await Transaction.updateOne(
      { referenceId: withdrawal._id.toString(), type: "withdrawal" },
      { status: "completed" }
    );

    const CompanyWalletTransaction = (await import("@/models/CompanyWalletTransaction")).default;
    await CompanyWalletTransaction.create({
      memberId: withdrawal.memberId,
      userName: userName,
      walletType: "main",
      type: "debit",
      transactionType: "withdrawal",
      amount: withdrawal.amount,
      description: `Approved withdrawal request of ${withdrawal.amount} USDT (net payable: ${withdrawal.netPayable} USDT) for member ${withdrawal.memberId}`,
    });

    if (withdrawal.processingCharge > 0) {
      await CompanyWalletTransaction.create({
        memberId: withdrawal.memberId,
        userName: userName,
        walletType: "revenue",
        type: "credit",
        transactionType: "withdrawal_fee",
        amount: withdrawal.processingCharge,
        description: `3% processing fee of ${withdrawal.processingCharge} USDT on withdrawal request for member ${withdrawal.memberId}`,
      });
    }
  } else {
    withdrawal.status = "rejected";
    // Refund the wallet since request is denied.
    await User.updateOne({ memberId: withdrawal.memberId }, { $inc: { walletBalance: withdrawal.amount } });
    await Transaction.updateOne(
      { referenceId: withdrawal._id.toString(), type: "withdrawal" },
      { status: "failed" }
    );
  }
  withdrawal.adminNote = adminNote || "";
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  await Notice.create({
    title: action === "approve" ? "Withdrawal Completed" : "Withdrawal Rejected",
    message:
      action === "approve"
        ? `Your withdrawal of ${withdrawal.netPayable} ${withdrawal.mode} has been processed.`
        : `Your withdrawal request was rejected and ${withdrawal.amount} has been refunded to your wallet.${adminNote ? " Reason: " + adminNote : ""}`,
    audience: "specific",
    targetMemberId: withdrawal.memberId,
  });

  // Personal notification
  notifyMember(
    withdrawal.memberId,
    action === "approve" ? "Withdrawal Approved ✅" : "Withdrawal Rejected ❌",
    action === "approve"
      ? `Your withdrawal of $${withdrawal.netPayable} (${withdrawal.mode}) has been processed successfully.`
      : `Your withdrawal request of $${withdrawal.amount} was rejected and refunded to your wallet.${adminNote ? " Reason: " + adminNote : ""}`,
    action === "approve" ? "withdrawal_approved" : "withdrawal_rejected",
    withdrawal._id
  ).catch(() => {});

  return NextResponse.json({ success: true, withdrawal });
}
