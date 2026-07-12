/**
 * lib/dailyReturn.ts
 * Shared business logic for daily return calculations, daily question generation,
 * and monthly settlement.
 * Locked to Asia/Kolkata (IST) timezone for daily schedule calculations.
 */

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Investment from "@/models/Investment";
import DailyReturn from "@/models/DailyReturn";
import Transaction from "@/models/Transaction";
import PredictionSubmission from "@/models/PredictionSubmission";
import PredictionQuestion from "@/models/PredictionQuestion";
import { getCachedBusinessRule } from "@/lib/businessRulesCache";
import { getCachedSettings } from "@/lib/settingsCache";
import DailyQuestion from "@/models/DailyQuestion";
import WebsiteSettings from "@/models/WebsiteSettings";
import { notifyMember } from "@/lib/notification";

// Helper to get today's date in IST
export function getISTDateString(date = new Date()): string {
  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  const dd = String(istDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to get active month string in IST (YYYY-MM)
export function getISTMonthString(date = new Date()): string {
  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export function getDaysInMonth(dateStr: string): number {
  const [year, month] = dateStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// ────────────────────────────────────────────────────────────
// DAILY QUESTION GENERATION
// ────────────────────────────────────────────────────────────
export async function runGenerateDailyQuestion(forceDate?: string) {
  await connectDB();

  const today = forceDate || getISTDateString();

  // Load WebsiteSettings to check auto-scheduler settings
  const settings = await WebsiteSettings.findOne({ key: "singleton" }) || await WebsiteSettings.create({ key: "singleton" });

  if (settings.autoPredictionEnabled && settings.nextScheduledQuestion) {
    // Remove any existing daily question for today first (reset previous active question)
    await DailyQuestion.deleteOne({ date: today });

    const dailyQuestion = await DailyQuestion.create({
      date: today,
      questionId: null,
      questionText: settings.nextScheduledQuestion,
      isManual: false,
      autoScheduled: true,
      scheduledFor: today,
      sentAt: new Date()
    });

    // Clear pending schedule
    settings.nextScheduledQuestion = "";
    await settings.save();

    return { success: true, created: true, autoScheduled: true, question: dailyQuestion };
  }

  // Check if today's DailyQuestion already exists
  const existing = await DailyQuestion.findOne({ date: today });
  if (existing) {
    return { skipped: true, reason: "Daily question already exists for date " + today, question: existing };
  }

  // Fetch active prediction questions
  const activeQuestions = await PredictionQuestion.find({ status: "active" });

  if (activeQuestions.length === 0) {
    console.error("[generate-daily-question] No active prediction questions found.");
    
    // Create a fallback question so it doesn't break
    const fallbackText = "Will the overall global market close higher today?";
    const fallbackQuestion = await DailyQuestion.create({
      date: today,
      questionId: null,
      questionText: fallbackText,
      isManual: false,
    });
    return { success: true, created: true, isFallback: true, question: fallbackQuestion };
  }

  // Sort them by lastUsedDate to find the least recently used
  const sorted = [...activeQuestions].sort((a, b) => {
    if (!a.lastUsedDate && b.lastUsedDate) return -1;
    if (a.lastUsedDate && !b.lastUsedDate) return 1;
    if (!a.lastUsedDate && !b.lastUsedDate) return 0;
    return a.lastUsedDate.localeCompare(b.lastUsedDate);
  });

  // Pick the oldest used question (first in list)
  const chosen = sorted[0];

  // Save as today's DailyQuestion
  const dailyQuestion = await DailyQuestion.create({
    date: today,
    questionId: chosen._id,
    questionText: chosen.questionText,
    isManual: false,
  });

  // Update chosen PredictionQuestion
  chosen.lastUsedDate = today;
  await chosen.save();

  return { success: true, created: true, question: dailyQuestion };
}

// ────────────────────────────────────────────────────────────
// DAILY RETURN (with Prediction eligibility & Monthly Production Rules)
// ────────────────────────────────────────────────────────────
export async function runDailyReturn(forceDate?: string) {
  await connectDB();

  // 1. Fetch config rules using cache
  const [completedRule, missedRule, maxMissLimitRule, modeRule, manualPctRule] = await Promise.all([
    getCachedBusinessRule("production_completed_monthly_rate"),
    getCachedBusinessRule("production_missed_monthly_rate"),
    getCachedBusinessRule("production_max_miss_limit"),
    getCachedBusinessRule("daily_return_mode"),
    getCachedBusinessRule("daily_return_manual_pct"),
  ]);

  const completedRate = completedRule ? Number(completedRule.value) : 7;
  const missedRate = missedRule ? Number(missedRule.value) : 5;
  const maxMissLimit = maxMissLimitRule ? Number(maxMissLimitRule.value) : 3;

  const mode = modeRule ? String(modeRule.value) : "auto";
  const manualDailyPct = manualPctRule ? Number(manualPctRule.value) : 0.2;

  // 2. Date strings in IST
  const today = forceDate || getISTDateString(); // "YYYY-MM-DD"
  const month = today.slice(0, 7); // "YYYY-MM"

  // 3. Process each member & admin
  const members = await User.find({ role: { $in: ["member", "admin"] } });

  // Pre-load dynamic settings
  const settings = await getCachedSettings() || await WebsiteSettings.create({ key: "singleton" });
  const minInvestment = settings.minimumInvestment ?? settings.pricing?.minInvestment ?? 100;
  const returnAfterOneMiss = settings.returnPlanAfterOneMiss ?? 5;
  const maxMissAllowed = settings.maximumMissAllowed ?? 2;

  // Bulk query to avoid N+1 database queries in loop
  const [allActiveInvestments, allSubmissions, allDailyReturns] = await Promise.all([
    Investment.find({ status: "active" }).select("memberId amount").lean(),
    PredictionSubmission.find({ date: today }).select("memberId").lean(),
    DailyReturn.find({ date: today }).select("memberId").lean(),
  ]);

  const investmentMap = new Map<string, number>();
  for (const inv of allActiveInvestments) {
    investmentMap.set(inv.memberId, (investmentMap.get(inv.memberId) || 0) + inv.amount);
  }

  const submissionSet = new Set(allSubmissions.map((s) => s.memberId));
  const dailyReturnSet = new Set(allDailyReturns.map((r) => r.memberId));

  let processed = 0;
  let skippedNoInvestment = 0;
  let skippedDuplicates = 0;
  let predictionMisses = 0;

  for (const member of members) {
    // Month Miss Reset Check (Safeguard / Primary reset mechanism)
    if (member.lastMissResetMonth !== month) {
      member.monthlyMissCount = 0;
      member.predictionLocked = false;
      member.predictionSubmitted = false;
      member.lastPredictionDate = "";
      member.currentReturnPlan = completedRate;
      member.productionStatus = "active";
      member.lastMissResetMonth = month;
      await member.save();
    }

    // Step 1: Duplicate Protection
    if (dailyReturnSet.has(member.memberId)) {
      skippedDuplicates++;
      continue;
    }

    // A. Sum active investments
    const totalActiveInvestment = investmentMap.get(member.memberId) || 0;

    if (totalActiveInvestment <= 0) {
      skippedNoInvestment++;
      continue;
    }

    const isInvestmentCompleted = (member.totalInvestment || 0) >= minInvestment;
    if (member.investmentCompleted !== isInvestmentCompleted) {
      member.investmentCompleted = isInvestmentCompleted;
      await member.save();
    }

    let dailyPlanRate = completedRate;

    // Step 2: Check Production Status / Prediction Lock
    if (member.predictionLocked || member.monthlyMissCount >= maxMissAllowed) {
      dailyPlanRate = 0;
    } else {
      // Step 3: Check prediction submission
      const hasSubmission = submissionSet.has(member.memberId);

      if (hasSubmission) {
        // Prediction Completed
        // Plan remains what it is based on past misses
        if (member.monthlyMissCount === 2) {
          dailyPlanRate = returnAfterOneMiss;
          member.currentReturnPlan = returnAfterOneMiss;
        } else {
          dailyPlanRate = completedRate;
          member.currentReturnPlan = completedRate;
        }
        member.predictionSubmitted = true;
        member.lastPredictionDate = today;
        await member.save();
      } else {
        // Prediction Missed - Today's return is 0
        member.monthlyMissCount = (member.monthlyMissCount || 0) + 1;
        predictionMisses++;
        dailyPlanRate = 0;

        if (member.monthlyMissCount >= maxMissAllowed) {
          // Max misses reached -> Locked, 0% Plan
          member.currentReturnPlan = 0;
          member.predictionLocked = true;
          member.productionStatus = "closed";
        } else if (member.monthlyMissCount === 2) {
          // 2nd Miss -> 5% Plan, remains active
          member.currentReturnPlan = returnAfterOneMiss;
        } else {
          // 1st Miss -> remains on 7% Plan, remains active
          member.currentReturnPlan = completedRate;
        }
        await member.save();
      }
    }

    // Compute effective daily percentage
    const daysInMonth = getDaysInMonth(today);
    const dailyPct = mode === "auto" ? (dailyPlanRate / daysInMonth) : manualDailyPct;

    // C. Calculate profit
    const profit = parseFloat(
      ((totalActiveInvestment * dailyPct) / 100).toFixed(6)
    );

    try {
      const runningTotal = parseFloat(
        ((member.dailyReturnPending || 0) + profit).toFixed(6)
      );

      await DailyReturn.create({
        memberId: member.memberId,
        date: today,
        month,
        investmentAmount: totalActiveInvestment,
        dailyPct,
        profit,
        runningTotal,
        settled: false,
      });

      if (profit > 0) {
        await Transaction.create({
          memberId: member.memberId,
          type: "returns_income",
          direction: "credit",
          amount: profit,
          currency: "USDT",
          status: "completed",
          note: `Daily ROI return for ${today}`,
          description: `Daily ROI yield of ${dailyPct.toFixed(6)}% on active investment $${totalActiveInvestment.toLocaleString()}`,
          walletType: "returns",
        });
      }

      const dailyInvReturn = parseFloat(((totalActiveInvestment * 0.233) / 100).toFixed(6));
      member.dailyReturnPending = runningTotal;
      member.returnsDailyEarnings = runningTotal;
      member.dailyReturnsWallet = (member.dailyReturnsWallet || 0) + profit;
      member.totalInvestmentReturn = (member.totalInvestmentReturn || 0) + dailyInvReturn;
      await member.save();
      processed++;
    } catch (err: any) {
      if (err.code === 11000) {
        skippedDuplicates++;
      } else {
        throw err;
      }
    }
  }

  return {
    date: today,
    mode,
    processed,
    skippedNoInvestment,
    skippedDuplicates,
    predictionMisses,
  };
}

// ────────────────────────────────────────────────────────────
// MONTHLY SETTLEMENT
// ────────────────────────────────────────────────────────────
export async function runMonthlySettlement(force = false) {
  await connectDB();

  // Fetch completed rate rule (for reset)
  const completedRule = await getCachedBusinessRule("production_completed_monthly_rate");
  const completedRate = completedRule ? Number(completedRule.value) : 7;

  const now = new Date();
  const dayOfMonth = now.getDate();

  if (dayOfMonth !== 1 && !force) {
    return {
      skipped: true,
      reason: "Not the 1st of the month. Use force=true to override.",
    };
  }

  // Previous month string in IST (YYYY-MM)
  const todayISTStr = getISTDateString();
  const [yyyy, mm] = todayISTStr.split("-").map(Number);
  const prevMonthDate = new Date(yyyy, mm - 2, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(
    prevMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const currentMonth = todayISTStr.slice(0, 7); // new current month

  const members = await User.find({
    role: "member"
  });

  let settled = 0;
  let totalAmount = 0;

  for (const member of members) {
    // Reset miss count, currentReturnPlan and productionStatus on monthly closeout
    member.monthlyMissCount = 0;
    member.predictionLocked = false;
    member.predictionSubmitted = false;
    member.lastPredictionDate = "";
    member.currentReturnPlan = completedRate;
    member.productionStatus = "active";
    member.lastMissResetMonth = currentMonth;

    // Duplicate Monthly Settlement Protection & Snapshot Summation (Daily returns)
    let amount = 0;
    let activeDays = 0;
    const isDailyReturnAlreadySettled = member.lastReturnsClosingPeriod === prevMonth;

    if (!isDailyReturnAlreadySettled) {
      const dailyRecords = await DailyReturn.find({
        memberId: member.memberId,
        month: prevMonth,
        settled: false,
      }).lean();
      activeDays = dailyRecords.length;
      const dailySum = dailyRecords.reduce((s: number, r: any) => s + (r.profit || 0), 0);
      amount = parseFloat(dailySum.toFixed(4));
    }
    
    // Duplicate Monthly Settlement Protection & Snapshot Summation (Level returns)
    let levelIncomeAmt = 0;
    let pendingRecords: any[] = [];
    const isLevelIncomeAlreadySettled = member.lastReturnsLevelClosing === prevMonth;

    if (!isLevelIncomeAlreadySettled) {
      const ReturnsLevelIncome = (await import("@/models/ReturnsLevelIncome")).default;
      pendingRecords = await ReturnsLevelIncome.find({
        recipientMemberId: member.memberId,
        status: "Pending"
      }).lean();
      
      const sum = pendingRecords.reduce((s: number, r: any) => s + (r.calculatedAmount || 0), 0);
      levelIncomeAmt = parseFloat(sum.toFixed(4));
    }

    if (amount > 0 || levelIncomeAmt > 0) {
      const combinedAmount = amount + levelIncomeAmt;

      if (amount > 0) {
        member.totalReturnsIncome = (member.totalReturnsIncome || 0) + amount;
        member.totalDailyReturnSettled = (member.totalDailyReturnSettled || 0) + amount;
        member.dailyReturnPending = 0;
        member.returnsDailyEarnings = 0;
        member.lastReturnsClosingPeriod = prevMonth;
        member.lastReturnsClosingAt = now;

        // Create transaction record for Daily ROI using new type
        const dailyTx = await Transaction.create({
          memberId: member.memberId,
          type: "RETURNS_MONTHLY_CLOSING",
          direction: "credit",
          amount,
          currency: "USDT",
          status: "completed",
          note: `Monthly settlement of daily returns for ${prevMonth}`,
          description: `Returns Income Closing - ${prevMonth}`,
          walletType: "returns",
        });

        // Mark all daily records for this member in the previous month as settled
        await DailyReturn.updateMany(
          { memberId: member.memberId, month: prevMonth, settled: false },
          { $set: { settled: true, settledAt: now } }
        );

        // Create ReturnsClosingHistory entry
        try {
          const ReturnsClosingHistory = (await import("@/models/ReturnsClosingHistory")).default;
          const [yyyy, mm] = prevMonth.split("-").map(Number);
          const startDate = new Date(yyyy, mm - 1, 1);
          const endDate = new Date(yyyy, mm, 0, 23, 59, 59, 999);

          await ReturnsClosingHistory.create({
            userId: member._id,
            memberId: member.memberId,
            closingPeriod: prevMonth,
            startDate,
            endDate,
            activeDays,
            totalReturn: amount,
            closingDate: now,
            walletCredited: true,
            transactionId: dailyTx._id.toString(),
            status: "Success",
          });
        } catch (histErr) {
          console.error(`Failed to create ReturnsClosingHistory for ${member.memberId}:`, histErr);
        }

        // Notify member
        notifyMember(
          member.memberId,
          "Monthly Return Settled 💰",
          `Your accumulated daily returns of $${amount.toLocaleString()} for ${prevMonth} have been transferred to your wallet.`,
          "returns_income",
          undefined
        ).catch(() => {});
      }

      if (levelIncomeAmt > 0) {
        member.totalReturnsLevelIncomeEarned = (member.totalReturnsLevelIncomeEarned || 0) + levelIncomeAmt;
        member.pendingReturnsLevelIncome = 0;
        member.lastReturnsLevelClosing = prevMonth;

        // Create transaction record for Returns Level Income
        const levelTx = await Transaction.create({
          memberId: member.memberId,
          type: "returns_level_income",
          direction: "credit",
          amount: levelIncomeAmt,
          currency: "USDT",
          status: "completed",
          note: `Monthly Returns Level Income Settlement - ${prevMonth}`,
          description: `Monthly Returns Level Income Settlement accumulated during ${prevMonth} credited to wallet.`,
          walletType: "returns",
        });

        // Mark specific ReturnsLevelIncome records as Credited
        const ReturnsLevelIncome = (await import("@/models/ReturnsLevelIncome")).default;
        await ReturnsLevelIncome.updateMany(
          { _id: { $in: pendingRecords.map(r => r._id) } },
          { $set: { status: "Credited", creditedAt: now, transactionId: levelTx._id.toString() } }
        );

        // Notify member
        notifyMember(
          member.memberId,
          "Monthly Returns Level Income Settled 💰",
          `Your accumulated Returns Level Income of $${levelIncomeAmt.toLocaleString()} for ${prevMonth} has been credited to your wallet.`,
          "returns_level_income",
          undefined
        ).catch(() => {});
      }

      settled++;
      totalAmount += combinedAmount;
    }

    await member.save();
  }

  return {
    settledMonth: prevMonth,
    membersSettled: settled,
    totalAmountSettled: parseFloat(totalAmount.toFixed(4)),
    forced: force,
  };
}

export async function recalculateDailyReturnForUser(memberId: string, date: string) {
  await connectDB();

  const today = date;
  const month = today.slice(0, 7);

  const member = await User.findOne({ memberId });
  if (!member) return { error: "Member not found" };

  // Check if there is a DailyReturn record for today
  const dailyReturnRecord = await DailyReturn.findOne({ memberId, date: today });
  if (!dailyReturnRecord) {
    // If no record exists, the cron hasn't run yet, so we don't need to retroactively credit.
    // The cron will process it normally when it runs.
    return { success: true, updated: false, reason: "Cron has not run yet for today" };
  }

  // If a record exists, check if it was processed as a miss (i.e. profit was 0 or dailyPct was 0)
  if (dailyReturnRecord.profit > 0 && dailyReturnRecord.dailyPct > 0) {
    // Already has positive profit, no need to recalculate
    return { success: true, updated: false, reason: "Already credited positive profit" };
  }

  // Load business rules
  const [completedRule, missedRule, maxMissLimitRule, modeRule, manualPctRule] = await Promise.all([
    getCachedBusinessRule("production_completed_monthly_rate"),
    getCachedBusinessRule("production_missed_monthly_rate"),
    getCachedBusinessRule("production_max_miss_limit"),
    getCachedBusinessRule("daily_return_mode"),
    getCachedBusinessRule("daily_return_manual_pct"),
  ]);

  const completedRate = completedRule ? Number(completedRule.value) : 7;
  const missedRate = missedRule ? Number(missedRule.value) : 5;
  const maxMissLimit = maxMissLimitRule ? Number(maxMissLimitRule.value) : 3;

  const mode = modeRule ? String(modeRule.value) : "auto";
  const manualDailyPct = manualPctRule ? Number(manualPctRule.value) : 0.2;

  const settings = await getCachedSettings() || await WebsiteSettings.create({ key: "singleton" });
  const returnAfterOneMiss = settings.returnPlanAfterOneMiss ?? 5;
  const maxMissAllowed = settings.maximumMissAllowed ?? 2;

  // Since they just submitted the prediction, we decrement their monthlyMissCount by 1
  const oldMissCount = member.monthlyMissCount || 0;
  if (oldMissCount > 0) {
    member.monthlyMissCount = oldMissCount - 1;
  }
  
  // Unlock if they were locked
  member.predictionLocked = false;
  member.productionStatus = "active";

  let dailyPlanRate = completedRate;
  if (member.monthlyMissCount === 2) {
    dailyPlanRate = returnAfterOneMiss;
  } else {
    dailyPlanRate = completedRate;
  }
  member.currentReturnPlan = dailyPlanRate;

  // Compute effective daily percentage
  const dailyPct = mode === "auto" ? dailyPlanRate : manualDailyPct;

  // Calculate profit
  const totalActiveInvestment = dailyReturnRecord.investmentAmount || 0;
  const profit = parseFloat(
    ((totalActiveInvestment * dailyPct) / 100).toFixed(6)
  );

  // Update DailyReturn record
  dailyReturnRecord.dailyPct = dailyPct;
  dailyReturnRecord.profit = profit;
  
  // Recalculate running total
  const oldProfit = 0;
  const diff = profit - oldProfit;
  
  dailyReturnRecord.runningTotal = parseFloat(
    ((dailyReturnRecord.runningTotal || 0) + diff).toFixed(6)
  );
  await dailyReturnRecord.save();

  // Update member balances
  member.dailyReturnPending = parseFloat(
    ((member.dailyReturnPending || 0) + diff).toFixed(6)
  );
  member.returnsDailyEarnings = member.dailyReturnPending;
  member.returnsWalletBalance = parseFloat(
    ((member.returnsWalletBalance || 0) + profit).toFixed(6)
  );

  if (profit > 0) {
    await Transaction.create({
      memberId: member.memberId,
      type: "returns_income",
      direction: "credit",
      amount: profit,
      currency: "USDT",
      status: "completed",
      note: `Daily ROI return for ${today} (Retroactive prediction)`,
      description: `Daily ROI yield of ${dailyPct.toFixed(4)}% on active investment $${totalActiveInvestment.toLocaleString()} (Retroactive prediction)`,
      walletType: "returns",
    });
  }

  member.predictionSubmitted = true;
  member.lastPredictionDate = today;

  await member.save();

  // Trigger daily Returns Level Income calculation for this retro credited amount
  try {
    const { calculateDailyReturnsLevelIncome } = await import("@/lib/returnsLevelIncome");
    // We can run it; calculateDailyReturnsLevelIncome handles all matching level incomes based on active ROI records.
    await calculateDailyReturnsLevelIncome();
  } catch (lvlErr) {
    console.error("Failed to run Level ROI calculation inside recalculateDailyReturnForUser:", lvlErr);
  }

  return { success: true, updated: true, profit, newMissCount: member.monthlyMissCount };
}

