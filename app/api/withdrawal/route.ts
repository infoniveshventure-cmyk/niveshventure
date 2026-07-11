import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Withdrawal from "@/models/Withdrawal";
import Transaction from "@/models/Transaction";
import WebsiteSettings from "@/models/WebsiteSettings";
import { compareSecret, getSessionFromCookies } from "@/lib/auth-server";
import { notifyMember } from "@/lib/notification";

const MIN_EARNING_WITHDRAWAL_USDT = 10;
const CHARGE_RATE = 0.03;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const withdrawals = await Withdrawal.find({ memberId: session.memberId }).sort({ createdAt: -1 });

  const BusinessRule = (await import("@/models/BusinessRule")).default;
  const minRule = await BusinessRule.findOne({ key: "withdrawal_min_amount" });
  const feeRule = await BusinessRule.findOne({ key: "withdrawal_fee_pct" });
  const minWithdrawal = minRule ? Number(minRule.value) : MIN_EARNING_WITHDRAWAL_USDT;
  const feeRate = feeRule ? Number(feeRule.value) : 3;

  return NextResponse.json({ withdrawals, minWithdrawal, feeRate });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, mode, bankDetails, usdtAddress, accessKey, withdrawalKind, walletType = "main" } = body;

    await connectDB();
    const BusinessRule = (await import("@/models/BusinessRule")).default;
    const minRule = await BusinessRule.findOne({ key: "withdrawal_min_amount" });
    const feeRule = await BusinessRule.findOne({ key: "withdrawal_fee_pct" });
    const minWithdrawal = minRule ? Number(minRule.value) : MIN_EARNING_WITHDRAWAL_USDT;
    const feeRate = feeRule ? Number(feeRule.value) / 100 : CHARGE_RATE;

    const settings = await WebsiteSettings.findOne({ key: "singleton" });
    if (settings && settings.withdrawalsEnabled === false) {
      return NextResponse.json(
        { error: "Withdrawals are temporarily unavailable due to technical maintenance. Please try again later." },
        { status: 403 }
      );
    }

    if (!amount || !mode || !accessKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (amount < minWithdrawal && withdrawalKind !== "capital") {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ${minWithdrawal} USDT` },
        { status: 400 }
      );
    }
    if (mode === "INR" && (!bankDetails?.bankName || !bankDetails?.accountNumber || !bankDetails?.ifsc)) {
      return NextResponse.json({ error: "Bank details are required for INR withdrawal" }, { status: 400 });
    }
    if (mode === "USDT" && !usdtAddress) {
      return NextResponse.json({ error: "USDT wallet address is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.withdrawalsEnabled === false) {
      return NextResponse.json({ error: "Withdrawals are disabled for your account. Please contact support." }, { status: 403 });
    }

    const sanitizedAccessKey = typeof accessKey === "string" ? accessKey.trim().toUpperCase() : "";
    const validKey = await compareSecret(sanitizedAccessKey, user.accessKeyHash);
    if (!validKey) return NextResponse.json({ error: "Invalid Access Key" }, { status: 401 });

    if (walletType === "returns" && withdrawalKind !== "capital") {
      const istDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (istDate.getDate() !== 1) {
        return NextResponse.json(
          { error: "Daily Returns & Level Income Wallet cash withdrawals are only allowed on the 1st of the month." },
          { status: 400 }
        );
      }
    }

    const balanceField = walletType === "returns" ? "returnsWalletBalance" : "walletBalance";
    if ((user as any)[balanceField] < amount) {
      return NextResponse.json({ error: `Insufficient ${walletType === "returns" ? "Daily Returns & Level Wallet" : "wallet"} balance` }, { status: 400 });
    }

    const processingCharge = Number((amount * feeRate).toFixed(2));
    const netPayable = Number((amount - processingCharge).toFixed(2));

    const withdrawal = await Withdrawal.create({
      memberId: user.memberId,
      amount,
      processingCharge,
      netPayable,
      mode,
      bankDetails: mode === "INR" ? bankDetails : undefined,
      usdtAddress: mode === "USDT" ? usdtAddress : "",
      withdrawalKind: withdrawalKind || "earning",
      status: "pending",
      walletType,
    });

    (user as any)[balanceField] -= amount;
    await user.save();

    await Transaction.create({
      memberId: user.memberId,
      type: "withdrawal",
      direction: "debit",
      amount,
      currency: mode,
      status: "pending",
      note: `Withdrawal request submitted from ${walletType === "returns" ? "Daily Returns & Level Wallet" : "Main Wallet"}`,
      referenceId: withdrawal._id.toString(),
      walletType,
    });

    // Notify user
    notifyMember(
      user.memberId,
      "Withdrawal Request Submitted 📤",
      `Your withdrawal request of $${amount} (${mode}) has been submitted and is under review.`,
      "withdrawal_requested",
      withdrawal._id
    ).catch(() => {});

    return NextResponse.json({ success: true, withdrawal });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Withdrawal request failed" }, { status: 500 });
  }
}
