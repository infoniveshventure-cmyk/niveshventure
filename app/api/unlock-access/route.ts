import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import BusinessHistory from "@/models/BusinessHistory";
import { getSessionFromCookies } from "@/lib/auth-server";
import { notifyMember } from "@/lib/notification";

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
  try {
    const body = await req.json();
    if (body.walletType) walletType = body.walletType;
  } catch {}

  const walletInfo = WALLET_FIELDS[walletType];
  if (!walletInfo) {
    return NextResponse.json({ error: "Invalid wallet selected" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ memberId: session.memberId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const currentBalance = (user as any)[walletInfo.field] ?? 0;
  if (currentBalance < RENEWAL_AMOUNT) {
    return NextResponse.json({ error: `Insufficient balance in ${walletInfo.label}.` }, { status: 400 });
  }

  const now = new Date();
  const base = user.accessExpiresAt && user.accessExpiresAt > now ? user.accessExpiresAt : now;
  const newExpiry = new Date(base.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  (user as any)[walletInfo.field] = currentBalance - RENEWAL_AMOUNT;
  user.isActive = true;
  user.accessExpiresAt = newExpiry;
  await user.save();

  await Transaction.create({
    memberId: user.memberId,
    type: "unlock_access",
    direction: "debit",
    amount: RENEWAL_AMOUNT,
    currency: "USDT",
    walletType,
    status: "completed",
    note: `Unlock Access activation using ${walletInfo.label}`,
  });

  await BusinessHistory.create({
    memberId: user.memberId,
    kind: "renewal",
    amount: RENEWAL_AMOUNT,
    note: `Unlock Access activation using ${walletInfo.label}`,
  });

  // Credit referral reward automatically if sponsor exists
  if (user.sponsorId) {
    try {
      const WebsiteSettings = (await import("@/models/WebsiteSettings")).default;
      const settings = await WebsiteSettings.findOne({ key: "singleton" });
      const rewardAmount = settings?.shareRewardAmount || 10; // Default to $10 if not configured
      if (rewardAmount > 0) {
        const sponsor = await User.findOne({ memberId: user.sponsorId });
        if (sponsor) {
          sponsor.walletBalance = (sponsor.walletBalance || 0) + rewardAmount;
          sponsor.totalReferralIncome = (sponsor.totalReferralIncome || 0) + rewardAmount;
          await sponsor.save();

          await Transaction.create({
            memberId: sponsor.memberId,
            type: "referral_income",
            direction: "credit",
            amount: rewardAmount,
            currency: "USDT",
            status: "completed",
            note: `Referral income — member ${user.memberId} activated account`,
            description: `Referral reward from member ${user.memberId} activation`,
          });

          notifyMember(
            sponsor.memberId,
            "Referral Income Credited 💸",
            `You received a referral bonus of $${rewardAmount} because your direct referral ${user.fullName} (${user.memberId}) activated their account.`,
            "referral_income"
          ).catch(() => {});
        }
      }
    } catch (refErr) {
      console.error("Failed to credit automatic referral reward:", refErr);
    }
  }

  // Check sponsor's booster eligibility
  if (user.sponsorId) {
    try {
      const { checkAndAwardBooster } = await import("@/lib/booster");
      await checkAndAwardBooster(user.sponsorId);
    } catch (e) {
      console.error("Booster check failed:", e);
    }

    // Notify sponsor that their referral became active
    notifyMember(
      user.sponsorId,
      "Referral Activated! 🎉",
      `Your referral ${user.memberId} (${user.fullName}) has just activated their account. Great news for your network!`,
      "referral_joined"
    ).catch(() => {});
  }

  // Notify user of successful activation
  notifyMember(
    user.memberId,
    "Account Activated Successfully! ✅",
    `Your account has been activated and is valid until ${newExpiry.toLocaleDateString()}. Welcome aboard!`,
    "account_activation"
  ).catch(() => {});

  return NextResponse.json({ success: true, accessExpiresAt: newExpiry });
}
