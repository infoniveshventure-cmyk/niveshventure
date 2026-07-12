import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Investment from "@/models/Investment";
import ReturnsLevelIncome from "@/models/ReturnsLevelIncome";
import { getCachedBusinessRules } from "@/lib/businessRulesCache";

// Helper to get today's date in IST
export function getISTDateString(date = new Date()): string {
  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  const dd = String(istDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to get days in the current month
export function getDaysInMonth(dateStr: string): number {
  const [year, month] = dateStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates and distributes Returns Level Income daily.
 * Based on downline user's Total Active Investment.
 */
export async function calculateDailyReturnsLevelIncome(forceDate?: string) {
  await connectDB();

  const today = forceDate || getISTDateString();
  const closingMonth = today.slice(0, 7); // Format: "YYYY-MM"
  const daysInMonth = getDaysInMonth(today);

  // Fetch all level percentage rules using cache
  const ruleKeys = Array.from({ length: 10 }, (_, i) => `returns_level_income_l${i + 1}_pct`);
  const allRules = await getCachedBusinessRules();
  const rules = allRules.filter((r) => ruleKeys.includes(r.key));
  const percentageMap = new Map<number, number>();
  
  // Set defaults, override with database configurations
  const defaultPercentages = [1.00, 0.50, 0.30, 0.25, 0.20, 0.15, 0.15, 0.15, 0.15, 0.15];
  for (let i = 1; i <= 10; i++) {
    const rule = rules.find((r) => r.key === `returns_level_income_l${i}_pct`);
    percentageMap.set(i, rule ? Number(rule.value) : defaultPercentages[i - 1]);
  }

  // Find all active, unblocked member accounts
  const members = await User.find({
    role: "member",
    isActive: true,
    isBlocked: { $ne: true }
  });

  const memberMap = new Map<string, any>(members.map((m) => [m.memberId, m]));

  // Bulk fetch all active investments to avoid N+1 queries in the loop
  const allActiveInvestments = await Investment.find({ status: "active" }).select("memberId amount").lean();
  const investmentMap = new Map<string, number>();
  for (const inv of allActiveInvestments) {
    investmentMap.set(inv.memberId, (investmentMap.get(inv.memberId) || 0) + inv.amount);
  }

  // Pre-calculate active direct counts for each member
  const activeDirectsMap = new Map<string, number>();
  for (const m of members) {
    if (m.sponsorId && m.isActive === true) {
      activeDirectsMap.set(m.sponsorId, (activeDirectsMap.get(m.sponsorId) || 0) + 1);
    }
  }

  let processedCount = 0;
  let skippedDuplicates = 0;
  let skippedNoInvestment = 0;

  for (const downline of members) {
    // 1. Prevent duplicate daily processing on this downline
    if (downline.lastReturnsLevelCalculationDate === today) {
      skippedDuplicates++;
      continue;
    }

    const totalActiveInvestment = investmentMap.get(downline.memberId) || 0;

    if (totalActiveInvestment <= 0) {
      skippedNoInvestment++;
      continue;
    }

    // 3. Traverse the sponsor tree up to 10 levels
    let currentSponsorId = downline.sponsorId;
    let depth = 1;

    while (currentSponsorId && depth <= 10) {
      const upline = memberMap.get(currentSponsorId);
      if (!upline) break;

      // Verify upline eligibility: Active, not blocked, not free PIN user
      const isUplineEligible = 
        upline.isActive === true &&
        upline.isBlocked !== true &&
        upline.activatedByFreePin !== true;

      if (isUplineEligible) {
        // Calculate max allowed level based on active directs
        const activeDirects = activeDirectsMap.get(upline.memberId) || 0;
        let maxAllowedLevel = 0;
        if (activeDirects === 1) maxAllowedLevel = 1;
        else if (activeDirects === 2) maxAllowedLevel = 2;
        else if (activeDirects === 3) maxAllowedLevel = 3;
        else if (activeDirects === 4) maxAllowedLevel = 4;
        else if (activeDirects >= 5) maxAllowedLevel = 10;

        if (depth <= maxAllowedLevel) {
          const percentage = percentageMap.get(depth) || 0;
          
          // Calculation Formula: (Total Active Investment * Level Percentage / 100) / Days in Month
          const calculatedAmount = parseFloat(
            ((totalActiveInvestment * (percentage / 100)) / daysInMonth).toFixed(6)
          );

          if (calculatedAmount > 0) {
            try {
            // Log entry into ReturnsLevelIncome
            await ReturnsLevelIncome.create({
              recipientMemberId: upline.memberId,
              recipientUserId: upline._id,
              downlineMemberId: downline.memberId,
              downlineUserId: downline._id,
              level: depth,
              percentage,
              investmentAmount: totalActiveInvestment,
              calculatedAmount,
              calculationDate: today,
              closingMonth,
              status: "Pending"
            });

            // Create Transaction record for daily ROI level income
            const Transaction = (await import("@/models/Transaction")).default;
            await Transaction.create({
              memberId: upline.memberId,
              type: "level_income",
              direction: "credit",
              amount: calculatedAmount,
              currency: "USDT",
              status: "completed",
              note: `Level ${depth} Returns Level Income from downline ${downline.memberId}`,
              description: `Level ${depth} yield of ${percentage}% on downline active investment $${totalActiveInvestment.toLocaleString()}`,
              walletType: "returns",
            });

            await User.updateOne(
              { _id: upline._id },
              { $inc: { dailyReturnsWallet: calculatedAmount, pendingReturnsLevelIncome: calculatedAmount } }
            );

          } catch (err: any) {
            // Handle mongo duplicate key error (code 11000) gracefully
            if (err.code !== 11000) {
              console.error(`Error saving ReturnsLevelIncome for ${upline.memberId}`, err);
            }
          }
        }
      }
    }

      currentSponsorId = upline.sponsorId;
      depth++;
    }

    // Mark downline as processed for today
    downline.lastReturnsLevelCalculationDate = today;
    await downline.save();
    processedCount++;
  }

  return {
    date: today,
    processedCount,
    skippedDuplicates,
    skippedNoInvestment,
  };
}
