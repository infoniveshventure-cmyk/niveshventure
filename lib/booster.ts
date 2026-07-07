import User from "@/models/User";
import Transaction from "@/models/Transaction";

/**
 * Checks and awards booster rewards to a sponsor (if eligible).
 * 
 * Booster Level 1:
 * - Requirement: 3 active direct referrals within 7 days of sponsor's own activation.
 * - Reward: $15 extra bonus
 * 
 * Booster Level 2:
 * - Requirement: 5 active direct referrals within 7 days of sponsor's own activation.
 * - Reward: $30 extra bonus
 */
export async function checkAndAwardBooster(sponsorId: string) {
  if (!sponsorId) return;

  const sponsor = await User.findOne({ memberId: sponsorId });
  if (!sponsor) return;

  // Sponsor must be active and have an accessExpiresAt / activation details
  // If not active, they cannot receive booster rewards
  if (!sponsor.isActive) return;

  // We can calculate activation date:
  // If accessExpiresAt exists, it is set to VALIDITY_DAYS (365) days from activation date.
  // Therefore, activationDate = accessExpiresAt - 365 days
  if (!sponsor.accessExpiresAt) return;

  const activationDate = new Date(
    new Date(sponsor.accessExpiresAt).getTime() - 365 * 24 * 60 * 60 * 1000
  );

  const boosterDeadline = new Date(activationDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  // If booster period (7 days from activation) has already expired, sponsor is no longer eligible for new/further booster qualifications
  if (now > boosterDeadline) return;

  // Let's count active direct referrals who joined & activated within sponsor's first 7 days
  // That means:
  // 1. Referral's sponsorId == sponsor.memberId
  // 2. Referral is currently active (isActive: true)
  // 3. Referral was activated within the booster window (referral.createdAt or activation must fall inside booster window).
  // Note: We can check if referral.isActive is true.
  const activeReferrals = await User.find({
    sponsorId: sponsor.memberId,
    isActive: true,
    createdAt: { $gte: activationDate, $lte: boosterDeadline }
  });

  const count = activeReferrals.length;
  if (count < 3) return;

  // Determine rewards. Use custom transaction checks to ensure we don't double award.
  // Check if Level 1 ($15) has already been awarded.
  const hasLvl1 = await Transaction.findOne({
    memberId: sponsor.memberId,
    type: "reward_income",
    note: { $regex: "Booster Level 1", $options: "i" }
  });

  if (count >= 3 && !hasLvl1) {
    sponsor.totalRewardIncome = (sponsor.totalRewardIncome || 0) + 15;
    sponsor.walletBalance = (sponsor.walletBalance || 0) + 15;
    await sponsor.save();

    await Transaction.create({
      memberId: sponsor.memberId,
      type: "reward_income",
      direction: "credit",
      amount: 15,
      currency: "USDT",
      status: "completed",
      note: "Booster Level 1 Reward - 3 Active Referrals in 7 Days",
    });

    // Log in RewardHistory
    try {
      const RewardHistory = (await import("@/models/RewardHistory")).default;
      await RewardHistory.create({
        memberId: sponsor.memberId,
        rewardType: "booster_reward",
        amount: 15,
        status: "released",
        adminRemarks: "Booster Level 1 Reward - 3 Active Referrals in 7 Days",
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Check if Level 2 ($30) has already been awarded.
  const hasLvl2 = await Transaction.findOne({
    memberId: sponsor.memberId,
    type: "reward_income",
    note: { $regex: "Booster Level 2", $options: "i" }
  });

  if (count >= 5 && !hasLvl2) {

    sponsor.totalRewardIncome = (sponsor.totalRewardIncome || 0) + 30;
    sponsor.walletBalance = (sponsor.walletBalance || 0) + 30;
    await sponsor.save();

    await Transaction.create({
      memberId: sponsor.memberId,
      type: "reward_income",
      direction: "credit",
      amount: 30,
      currency: "USDT",
      status: "completed",
      note: "Booster Level 2 Reward - 5 Active Referrals in 7 Days",
    });

    // Log in RewardHistory
    try {
      const RewardHistory = (await import("@/models/RewardHistory")).default;
      await RewardHistory.create({
        memberId: sponsor.memberId,
        rewardType: "booster_reward",
        amount: 30,
        status: "released",
        adminRemarks: "Booster Level 2 Reward - 5 Active Referrals in 7 Days",
      });
    } catch (e) {
      console.error(e);
    }
  }
}
