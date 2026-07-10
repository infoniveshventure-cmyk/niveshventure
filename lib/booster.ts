import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { getCachedBusinessRule } from "@/lib/businessRulesCache";

/**
 * Checks and awards booster rewards to a sponsor (if eligible).
 * 
 * Booster Tier 1:
 * - Requirement: 3 active direct referrals within 7 days (or configured days) of sponsor's registration.
 * - Reward: $15 extra bonus (credited to Booster Wallet)
 * 
 * Booster Tier 2:
 * - Requirement: 5 active direct referrals within 7 days (or configured days) of sponsor's registration.
 * - Reward: $30 extra bonus (credited to Booster Wallet)
 */
export async function checkAndAwardBooster(sponsorId: string) {
  if (!sponsorId) return;

  const sponsor = await User.findOne({ memberId: sponsorId });
  if (!sponsor) return;

  // Sponsor must be active to receive booster rewards
  if (!sponsor.isActive) return;

  // Fetch admin settings for booster
  const daysRule = await getCachedBusinessRule("booster_qualification_days");
  const reward3Rule = await getCachedBusinessRule("booster_reward_3_referrals");
  const reward5Rule = await getCachedBusinessRule("booster_reward_5_referrals");

  const boosterQualificationDays = daysRule ? Number(daysRule.value) : 7;
  const reward3 = reward3Rule ? Number(reward3Rule.value) : 15;
  const reward5 = reward5Rule ? Number(reward5Rule.value) : 30;

  // Calculate booster window based on sponsor's Registration Date (createdAt)
  const boosterStartDate = sponsor.createdAt || new Date();
  const boosterDeadline = new Date(
    new Date(boosterStartDate).getTime() + boosterQualificationDays * 24 * 60 * 60 * 1000
  );

  // Update sponsor's qualification expiry if not set or different
  if (!sponsor.boosterQualificationExpiry || sponsor.boosterQualificationExpiry.getTime() !== boosterDeadline.getTime()) {
    sponsor.boosterQualificationExpiry = boosterDeadline;
    await sponsor.save();
  }

  // Count active direct referrals who registered & activated within sponsor's qualification window
  // 1. Referral's sponsorId == sponsor.memberId
  // 2. Referral is currently active (isActive: true)
  // 3. Referral completed activation within the sponsor's booster window.
  // Note: Activation date is derived as referral.accessExpiresAt - 365 days.
  const referrals = await User.find({
    sponsorId: sponsor.memberId,
    isActive: true,
  });

  const activeWithinWindow = referrals.filter((referral) => {
    if (!referral.accessExpiresAt) return false;
    const referralActivationDate = new Date(
      new Date(referral.accessExpiresAt).getTime() - 365 * 24 * 60 * 60 * 1000
    );
    return referralActivationDate >= boosterStartDate && referralActivationDate <= boosterDeadline;
  });

  const count = activeWithinWindow.length;

  // If count is less than 3, user does not qualify for any reward
  if (count < 3) return;

  // Check existing transactions to prevent double credit
  const hasLvl1 = await Transaction.findOne({
    memberId: sponsor.memberId,
    type: "booster_income",
    note: { $regex: "Booster Level 1", $options: "i" }
  });

  const hasLvl2 = await Transaction.findOne({
    memberId: sponsor.memberId,
    type: "booster_income",
    note: { $regex: "Booster Level 2", $options: "i" }
  });

  const now = new Date();

  // Tier 1 Qualification Check (3 Direct Active Referrals)
  if (count >= 3 && !hasLvl1) {
    // Only reward if we haven't already awarded level 2 (though level 1 usually comes first)
    if (!hasLvl2) {
      sponsor.boosterWalletBalance = (sponsor.boosterWalletBalance || 0) + reward3;
      sponsor.totalBoosterIncome = (sponsor.totalBoosterIncome || 0) + reward3;
      sponsor.boosterQualified = true;
      sponsor.boosterRewardAmount = reward3;
      sponsor.boosterRewardDate = now;
      await sponsor.save();

      await Transaction.create({
        memberId: sponsor.memberId,
        type: "booster_income",
        direction: "credit",
        amount: reward3,
        currency: "USDT",
        status: "completed",
        note: `Booster Level 1 Reward - 3 Active Referrals in ${boosterQualificationDays} Days`,
        description: `Qualified for Booster Level 1 by completing 3 active direct referrals in ${boosterQualificationDays} days.`,
        walletType: "booster",
      });
    }
  }

  // Tier 2 Qualification Check (5 Direct Active Referrals)
  if (count >= 5 && !hasLvl2) {
    const alreadyReceivedLvl1 = !!hasLvl1 || (sponsor.boosterRewardAmount === reward3);
    const rewardDiff = alreadyReceivedLvl1 ? (reward5 - reward3) : reward5;

    if (rewardDiff > 0) {
      sponsor.boosterWalletBalance = (sponsor.boosterWalletBalance || 0) + rewardDiff;
      sponsor.totalBoosterIncome = (sponsor.totalBoosterIncome || 0) + rewardDiff;
      sponsor.boosterQualified = true;
      sponsor.boosterRewardClaimed = true;
      sponsor.boosterRewardAmount = reward5;
      sponsor.boosterRewardDate = now;
      await sponsor.save();

      await Transaction.create({
        memberId: sponsor.memberId,
        type: "booster_income",
        direction: "credit",
        amount: rewardDiff,
        currency: "USDT",
        status: "completed",
        note: `Booster Level 2 Reward - 5 Active Referrals in ${boosterQualificationDays} Days`,
        description: `Qualified for Booster Level 2 by completing 5 active direct referrals in ${boosterQualificationDays} days.`,
        walletType: "booster",
      });
    }
  }
}
