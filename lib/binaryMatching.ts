import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import WebsiteSettings from "@/models/WebsiteSettings";
import BusinessRule from "@/models/BusinessRule";
import Commission from "@/models/Commission";
import { notifyMember } from "@/lib/notification";
import { checkAndAwardBooster } from "@/lib/booster";

export async function processActivationIncomes(targetMemberId: string, customPrice?: number) {
  await connectDB();

  // Find the target user
  const user = await User.findOne({ memberId: targetMemberId });
  if (!user) throw new Error("User not found");

  const now = new Date();
  
  // 1. Activate User (ensure isActive is true and validity is updated)
  const isFirstTimeActivation = !user.isActive;
  user.isActive = true;
  
  // Set accessExpiresAt if not set or expired
  const VALIDITY_DAYS = 365;
  const base = user.accessExpiresAt && user.accessExpiresAt > now ? user.accessExpiresAt : now;
  const newExpiry = new Date(base.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  user.accessExpiresAt = newExpiry;
  await user.save();

  // Load WebsiteSettings to get pricing and settings
  const settings = await WebsiteSettings.findOne({ key: "singleton" });
  const activationPrice = user.activatedByFreePin ? 0 : (customPrice || settings?.pricing?.unlockAccessPrice || 30);

  // 2. Release Referral Income
  if (user.sponsorId) {
    try {
      const commConfig = await Commission.findOne({ key: "singleton" }) || await Commission.create({ key: "singleton" });
      const level1Pct = commConfig?.level1 ?? 5; // Default to 5%
      
      const referralIncomeAmount = activationPrice * (level1Pct / 100);
      
      if (referralIncomeAmount > 0) {
        const sponsor = await User.findOne({ memberId: user.sponsorId });
        if (sponsor) {
          sponsor.walletBalance = (sponsor.walletBalance || 0) + referralIncomeAmount;
          sponsor.totalReferralIncome = (sponsor.totalReferralIncome || 0) + referralIncomeAmount;
          await sponsor.save();

          await Transaction.create({
            memberId: sponsor.memberId,
            type: "referral_income",
            direction: "credit",
            amount: referralIncomeAmount,
            currency: "USDT",
            status: "completed",
            note: `Referral income — member ${user.memberId} activated account`,
            description: `Referral reward from member ${user.memberId} activation (${level1Pct}%)`,
          });

          notifyMember(
            sponsor.memberId,
            "Referral Income Credited 💸",
            `You received a referral bonus of $${referralIncomeAmount.toFixed(2)} because your direct referral ${user.fullName} (${user.memberId}) activated their account.`,
            "referral_income"
          ).catch(() => {});
        }
      }
    } catch (refErr) {
      console.error("Failed to credit automatic referral reward:", refErr);
    }
  }

  // 3. Calculate Binary Matching & Release Matching Income
  // Note: Only perform binary matching calculation if this is the first activation of the user (to avoid duplicate matching/income on subsequent renewals/activations)
  if (isFirstTimeActivation) {
    try {
      // Fetch binary matching rules
      const rule = await BusinessRule.findOne({ key: "matching_income_pct" });
      const matchingPct = rule ? Number(rule.value) : 10; // Default to 10%
      const perPairIncome = activationPrice * (matchingPct / 100);

      // Walk up the placement parent upline chain
      let current = user;
      let depth = 0;
      const MAX_DEPTH = 200;

      while (current && current.parentId && current.position && depth < MAX_DEPTH) {
        const parentMemberId = current.parentId;
        const side = current.position; // "left" or "right"

        const parent = await User.findOne({ memberId: parentMemberId });
        if (parent) {
          let leftCount = parent.leftCarryForward || 0;
          let rightCount = parent.rightCarryForward || 0;

          // Increment count on descending side
          if (side === "left") {
            leftCount += 1;
          } else {
            rightCount += 1;
          }

          // Calculate matching pairs
          const matchedPairs = Math.min(leftCount, rightCount);
          const matchingIncome = matchedPairs * perPairIncome;

          // Update carry forward values
          parent.leftCarryForward = leftCount - matchedPairs;
          parent.rightCarryForward = rightCount - matchedPairs;

          // Release matching income if pairs matched
          if (matchedPairs > 0) {
            if (parent.isActive) {
              parent.totalMatchingIncome = (parent.totalMatchingIncome || 0) + matchingIncome;
              parent.walletBalance = (parent.walletBalance || 0) + matchingIncome;

              await Transaction.create({
                memberId: parent.memberId,
                type: "matching_income",
                direction: "credit",
                amount: matchingIncome,
                currency: "USDT",
                status: "completed",
                note: `Binary Matching Income: Matched ${matchedPairs} pairs`,
                description: `Matched: ${matchedPairs} pairs | Per Pair: $${perPairIncome.toFixed(2)} | Carry Forward Left: ${parent.leftCarryForward} | Carry Forward Right: ${parent.rightCarryForward}`,
                leftActiveCount: leftCount,
                rightActiveCount: rightCount,
                matchedPairs,
                perPairIncome,
                carryForwardLeft: parent.leftCarryForward,
                carryForwardRight: parent.rightCarryForward,
              });

              notifyMember(
                parent.memberId,
                "Binary Matching Income Credited 💥",
                `You received $${matchingIncome.toFixed(2)} matching income for matching ${matchedPairs} pairs.`,
                "matching_income"
              ).catch(() => {});
            } else {
              // Parent is inactive, matching transaction status is failed
              await Transaction.create({
                memberId: parent.memberId,
                type: "matching_income",
                direction: "credit",
                amount: matchingIncome,
                currency: "USDT",
                status: "failed",
                note: `Matching income skipped — Sponsor/Parent account is Inactive`,
                description: `Matched: ${matchedPairs} pairs | Per Pair: $${perPairIncome.toFixed(2)} | Carry Forward Left: ${parent.leftCarryForward} | Carry Forward Right: ${parent.rightCarryForward}`,
                leftActiveCount: leftCount,
                rightActiveCount: rightCount,
                matchedPairs,
                perPairIncome,
                carryForwardLeft: parent.leftCarryForward,
                carryForwardRight: parent.rightCarryForward,
              });
            }
          }

          // Save changes to the parent
          await parent.save();
        }

        current = parent as any;
        depth++;
      }
    } catch (matchErr) {
      console.error("Failed to calculate binary matching:", matchErr);
    }
  }

  // 4. Trigger Booster checks
  if (user.sponsorId) {
    try {
      await checkAndAwardBooster(user.sponsorId);
    } catch (e) {
      console.error("Booster check failed:", e);
    }
  }

  return { accessExpiresAt: newExpiry };
}
