import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import WebsiteSettings from "@/models/WebsiteSettings";
import Notice from "@/models/Notice";
import CompanyWalletTransaction from "@/models/CompanyWalletTransaction";
import { requireAdmin } from "@/lib/require-admin";
import { notifyMember } from "@/lib/notification";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  await connectDB();
  const status = req.nextUrl.searchParams.get("status");
  const query: any = {};
  if (status && status !== "all") {
    query.status = status;
  }
  const deposits = await Deposit.find(query).sort({ createdAt: -1 }).limit(200).lean();

  const memberIds = deposits.map((d: any) => d.memberId);
  const users = await User.find({ memberId: { $in: memberIds } }).select("memberId fullName").lean();
  const userMap = new Map(users.map((u: any) => [u.memberId, u.fullName]));

  const depositsWithUser = deposits.map((d: any) => ({
    ...d,
    userName: userMap.get(d.memberId) || "Unknown User"
  }));

  return NextResponse.json({ deposits: depositsWithUser });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { depositId, action, amount } = await req.json();
  if (!depositId || !["verify", "reject"].includes(action)) {
    return NextResponse.json({ error: "depositId and valid action required" }, { status: 400 });
  }

  await connectDB();
  const deposit = await Deposit.findById(depositId);
  if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  if (deposit.status !== "pending") return NextResponse.json({ error: "Already processed" }, { status: 400 });

  if (action === "verify") {
    const creditAmount = amount || deposit.amount;
    deposit.status = "verified";
    deposit.amount = creditAmount;
    const depositor = await User.findOneAndUpdate(
      { memberId: deposit.memberId },
      { $inc: { walletBalance: creditAmount } },
      { new: true }
    );

    await CompanyWalletTransaction.create({
      memberId: deposit.memberId,
      userName: depositor ? depositor.fullName : "Unknown User",
      walletType: "main",
      type: "credit",
      transactionType: "deposit",
      amount: creditAmount,
      description: `Deposit verified by admin for user ${deposit.memberId}`,
    });

    await Transaction.create({
      memberId: deposit.memberId,
      type: "deposit",
      direction: "credit",
      amount: creditAmount,
      currency: "USDT",
      status: "completed",
      note: "Deposit verified by admin",
      referenceId: deposit._id.toString(),
    });

    // One-time referral share reward: fires only on this member's first verified deposit.
    if (depositor && depositor.sponsorId && !depositor.firstDepositRewarded) {
      const settings = await WebsiteSettings.findOne({ key: "singleton" });
      const rewardAmount = settings?.shareRewardAmount || 0;
      if (rewardAmount > 0) {
        const sponsor = await User.findOneAndUpdate(
          { memberId: depositor.sponsorId },
          {
            $inc: {
              walletBalance: rewardAmount,
              totalReferralIncome: rewardAmount,
              totalRewardIncome: rewardAmount,
            },
          },
          { new: true }
        );
        if (sponsor) {
          await Transaction.create({
            memberId: sponsor.memberId,
            type: "share_reward",
            direction: "credit",
            amount: rewardAmount,
            currency: "USDT",
            status: "completed",
            note: `Referral share reward — ${depositor.memberId} completed first deposit`,
          });

          notifyMember(
            sponsor.memberId,
            "Referral Reward 🎁",
            `You received a referral reward of $${rewardAmount} for ${depositor.memberId}'s first deposit.`,
            "referral_reward",
            deposit._id
          ).catch(() => {});
        }
      }
      depositor.firstDepositRewarded = true;
      await depositor.save();
    }
    await Notice.create({
      title: "Deposit Approved",
      message: `Your deposit of ${creditAmount} has been verified and credited to your wallet.`,
      audience: "specific",
      targetMemberId: deposit.memberId,
    });
    notifyMember(
      deposit.memberId,
      "Deposit Approved ✅",
      `Your deposit of $${creditAmount} has been verified and credited to your wallet.`,
      "deposit_approved",
      deposit._id
    ).catch(() => {});
  } else {
    deposit.status = "rejected";
    await Notice.create({
      title: "Deposit Rejected",
      message: "Your deposit request was rejected — the screenshot/transaction could not be verified. Contact support if you believe this is an error.",
      audience: "specific",
      targetMemberId: deposit.memberId,
    });
    notifyMember(
      deposit.memberId,
      "Deposit Rejected ❌",
      "Your deposit request was rejected. The screenshot/transaction could not be verified. Contact support if needed.",
      "deposit_rejected",
      deposit._id
    ).catch(() => {});
  }
  await deposit.save();

  return NextResponse.json({ success: true, deposit });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const depositId = searchParams.get("depositId");
  if (!depositId) {
    return NextResponse.json({ error: "depositId is required" }, { status: 400 });
  }

  await connectDB();
  const deposit = await Deposit.findById(depositId);
  if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });

  deposit.paymentSlipUrl = "";
  await deposit.save();

  return NextResponse.json({ success: true, deposit });
}

