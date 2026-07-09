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
import BusinessRule from "@/models/BusinessRule";
import PredictionSubmission from "@/models/PredictionSubmission";
import PredictionQuestion from "@/models/PredictionQuestion";
import DailyQuestion from "@/models/DailyQuestion";
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

// ────────────────────────────────────────────────────────────
// DAILY QUESTION GENERATION
// ────────────────────────────────────────────────────────────
export async function runGenerateDailyQuestion(forceDate?: string) {
  await connectDB();

  const today = forceDate || getISTDateString();

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

  // 1. Fetch config rules
  const [completedRule, missedRule, maxMissLimitRule, modeRule, manualPctRule] = await Promise.all([
    BusinessRule.findOne({ key: "production_completed_monthly_rate" }),
    BusinessRule.findOne({ key: "production_missed_monthly_rate" }),
    BusinessRule.findOne({ key: "production_max_miss_limit" }),
    BusinessRule.findOne({ key: "daily_return_mode" }),
    BusinessRule.findOne({ key: "daily_return_manual_pct" }),
  ]);

  const completedRate = completedRule ? Number(completedRule.value) : 7;
  const missedRate = missedRule ? Number(missedRule.value) : 5;
  const maxMissLimit = maxMissLimitRule ? Number(maxMissLimitRule.value) : 3;

  const mode = modeRule ? String(modeRule.value) : "auto";
  const manualDailyPct = manualPctRule ? Number(manualPctRule.value) : 0.2;

  // 2. Date strings in IST
  const today = forceDate || getISTDateString(); // "YYYY-MM-DD"
  const month = today.slice(0, 7); // "YYYY-MM"

  // 3. Process each member
  const members = await User.find({ role: "member" });

  let processed = 0;
  let skippedNoInvestment = 0;
  let skippedDuplicates = 0;
  let predictionMisses = 0;

  for (const member of members) {
    // Month Miss Reset Check (Safeguard / Primary reset mechanism)
    if (member.lastMissResetMonth !== month) {
      member.monthlyMissCount = 0;
      member.currentReturnPlan = completedRate;
      member.productionStatus = "active";
      member.lastMissResetMonth = month;
      await member.save();
    }

    // Step 1: Duplicate Protection
    const existingReturn = await DailyReturn.findOne({
      memberId: member.memberId,
      date: today,
    });
    if (existingReturn) {
      skippedDuplicates++;
      continue;
    }

    // A. Sum active investments
    const investments = await Investment.find({
      memberId: member.memberId,
      status: "active",
    }).select("amount");

    const totalActiveInvestment = investments.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );

    if (totalActiveInvestment <= 0) {
      skippedNoInvestment++;
      continue;
    }

    let dailyPlanRate = completedRate;

    // Step 2: Check Production Status
    if (member.productionStatus === "closed") {
      // Production closed: lock to missed plan rate
      dailyPlanRate = missedRate;
    } else {
      // Step 3: Active Production User - check prediction submission
      const submission = await PredictionSubmission.findOne({
        memberId: member.memberId,
        date: today,
      });

      if (submission) {
        // Case A: Prediction Completed
        dailyPlanRate = completedRate;
        member.currentReturnPlan = completedRate;
        await member.save();
      } else {
        // Case B: Prediction Missed
        member.monthlyMissCount = (member.monthlyMissCount || 0) + 1;
        predictionMisses++;

        if (member.monthlyMissCount >= maxMissLimit) {
          // 2nd Miss (or greater): downgrade to 5% and close production status
          dailyPlanRate = missedRate;
          member.currentReturnPlan = missedRate;
          member.productionStatus = "closed";
        } else {
          // 1st Miss: remains on 7% plan
          dailyPlanRate = completedRate;
          member.currentReturnPlan = completedRate;
        }
        await member.save();
      }
    }

    // Compute effective daily percentage
    const dailyPct = mode === "auto" ? dailyPlanRate / 30 : manualDailyPct;

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

      member.dailyReturnPending = runningTotal;
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
  const completedRule = await BusinessRule.findOne({ key: "production_completed_monthly_rate" });
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
    member.currentReturnPlan = completedRate;
    member.productionStatus = "active";
    member.lastMissResetMonth = currentMonth;

    const amount = parseFloat((member.dailyReturnPending || 0).toFixed(4));
    if (amount > 0) {
      member.walletBalance = (member.walletBalance || 0) + amount;
      member.totalReturnsIncome = (member.totalReturnsIncome || 0) + amount;
      member.totalDailyReturnSettled = (member.totalDailyReturnSettled || 0) + amount;
      member.dailyReturnPending = 0;

      // Create transaction record
      await Transaction.create({
        memberId: member.memberId,
        type: "returns_income",
        direction: "credit",
        amount,
        currency: "USDT",
        status: "completed",
        note: `Monthly settlement of daily returns for ${prevMonth}`,
        description: `Daily return profits accumulated during ${prevMonth} settled to wallet.`,
        walletType: "main",
      });

      // Mark all daily records for this member in the previous month as settled
      await DailyReturn.updateMany(
        { memberId: member.memberId, month: prevMonth, settled: false },
        { $set: { settled: true, settledAt: now } }
      );

      // Notify member
      notifyMember(
        member.memberId,
        "Monthly Return Settled 💰",
        `Your accumulated daily returns of $${amount.toLocaleString()} for ${prevMonth} have been transferred to your wallet.`,
        "returns_income",
        undefined
      ).catch(() => {});

      settled++;
      totalAmount += amount;
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
