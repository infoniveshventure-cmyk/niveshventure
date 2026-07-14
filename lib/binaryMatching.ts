import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { notifyMember } from "@/lib/notification";
import { checkAndAwardBooster } from "@/lib/booster";
import { getCachedSettings } from "@/lib/settingsCache";
import { getCachedBusinessRule } from "@/lib/businessRulesCache";

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
  const settings = await getCachedSettings();
  const activationPrice = user.activatedByFreePin ? 0 : (customPrice || settings?.pricing?.unlockAccessPrice || 30);

  // 2. Release Referral Income (5 Levels of Fixed Amounts)
  if (user.sponsorId) {
    try {
      const [ruleL1, ruleL2, ruleL3, ruleL4, ruleL5] = await Promise.all([
        getCachedBusinessRule("referral_level1_amt"),
        getCachedBusinessRule("referral_level2_amt"),
        getCachedBusinessRule("referral_level3_amt"),
        getCachedBusinessRule("referral_level4_amt"),
        getCachedBusinessRule("referral_level5_amt"),
      ]);
      const levelAmounts = [
        ruleL1 ? Number(ruleL1.value) : 5.00,
        ruleL2 ? Number(ruleL2.value) : 2.00,
        ruleL3 ? Number(ruleL3.value) : 1.25,
        ruleL4 ? Number(ruleL4.value) : 1.00,
        ruleL5 ? Number(ruleL5.value) : 0.75,
      ];

      let currentSponsorId = user.sponsorId;
      let level = 1;
      while (currentSponsorId && level <= 5) {
        const sponsor = await User.findOne({ memberId: currentSponsorId });
        if (!sponsor) break;

        // Direct sponsor must be active to receive referral commissions
        if (sponsor.isActive) {
          const amount = levelAmounts[level - 1];
          if (amount > 0) {
            // Check sponsor's active directs count
            const activeDirectsCount = await User.countDocuments({ sponsorId: sponsor.memberId, isActive: true });
            const requiredDirects = [0, 2, 3, 4, 5][level - 1];

            if (activeDirectsCount >= requiredDirects) {
              sponsor.earningsWalletBalance = (sponsor.earningsWalletBalance || 0) + amount;
              sponsor.totalReferralIncome = (sponsor.totalReferralIncome || 0) + amount;
              await sponsor.save();

              await Transaction.create({
                memberId: sponsor.memberId,
                type: "referral_income",
                direction: "credit",
                amount: amount,
                currency: "USDT",
                status: "completed",
                note: `Level ${level} Referral Income — member ${user.memberId} activated account`,
                description: `Level ${level} referral reward from member ${user.memberId} activation ($${amount.toFixed(2)})`,
              });

              notifyMember(
                sponsor.memberId,
                "Referral Income Credited 💸",
                `You received a Level ${level} referral bonus of $${amount.toFixed(2)} because your downline referral ${user.fullName} (${user.memberId}) activated their account.`,
                "referral_income"
              ).catch(() => {});
            } else {
              // Log forfeited/lapse transaction for transparency (wallet balance is NOT credited)
              await Transaction.create({
                memberId: sponsor.memberId,
                type: "referral_income",
                direction: "credit",
                amount: amount,
                currency: "USDT",
                status: "failed",
                note: `Level ${level} Referral Income forfeited — Insufficient active directs`,
                description: `Forfeited: Level ${level} referral income of $${amount.toFixed(2)} from ${user.memberId}. Sponsor has only ${activeDirectsCount} active directs (requires ${requiredDirects}).`,
              });

              notifyMember(
                sponsor.memberId,
                "Referral Income Forfeited ⚠️",
                `Level ${level} referral income of $${amount.toFixed(2)} from ${user.fullName} (${user.memberId}) was forfeited because you only have ${activeDirectsCount} active directs (requires ${requiredDirects}).`,
                "referral_income"
              ).catch(() => {});
            }
          }
        }

        currentSponsorId = sponsor.sponsorId;
        level++;
      }
    } catch (refErr) {
      console.error("Failed to credit automatic 5-level referral reward:", refErr);
    }
  }

  // 3. Calculate Binary Matching & Release Matching Income
  // Note: Only perform binary matching calculation if this is the first activation of the user (to avoid duplicate matching/income on subsequent renewals/activations)
  if (isFirstTimeActivation) {
    try {
      // Fetch binary matching rules
      const rule = await getCachedBusinessRule("matching_income_pct");
      let perPairIncome = 0;
      if (rule) {
        const isPercentageMode = rule.type === "percentage" || rule.unit === "%";
        if (isPercentageMode) {
          perPairIncome = activationPrice * (Number(rule.value) / 100);
        } else {
          // Dollar ($) mode
          perPairIncome = Number(rule.value);
        }
      } else {
        perPairIncome = activationPrice * 0.10; // Default to 10%
      }

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
              parent.earningsWalletBalance = (parent.earningsWalletBalance || 0) + matchingIncome;

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
