import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth-server";
import DailyQuestion from "@/models/DailyQuestion";
import PredictionSubmission from "@/models/PredictionSubmission";
import User from "@/models/User";
import WebsiteSettings from "@/models/WebsiteSettings";
import Investment from "@/models/Investment";
import { getISTDateString, recalculateDailyReturnForUser } from "@/lib/dailyReturn";
import ReturnsLevelIncome from "@/models/ReturnsLevelIncome";
import DailyReturn from "@/models/DailyReturn";

export const dynamic = "force-dynamic";

// GET: Fetch today's question and the user's state
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const today = getISTDateString();
  const month = today.slice(0, 7);

  // Get user details
  const user = await User.findOne({ memberId: session.memberId }).select(
    "isActive totalInvestment monthlyMissCount lastMissResetMonth currentReturnPlan predictionLocked predictionSubmitted lastPredictionDate"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get settings
  let settings = await WebsiteSettings.findOne({ key: "singleton" });
  if (!settings) {
    settings = await WebsiteSettings.create({ key: "singleton" });
  }

  // Reset check (safeguard / month change logic)
  if (user.lastMissResetMonth !== month) {
    user.monthlyMissCount = 0;
    user.predictionLocked = false;
    user.predictionSubmitted = false;
    user.lastPredictionDate = "";
    user.currentReturnPlan = 7;
    user.lastMissResetMonth = month;
    await user.save();
  }

  // Auto lock prediction window if user has 3 or more misses
  if (user.monthlyMissCount >= 3 && !user.predictionLocked) {
    user.predictionLocked = true;
    await user.save();
  }

  // Update investmentCompleted dynamically in DB
  const minInvestment = settings.minimumInvestment ?? settings.pricing?.minInvestment ?? 100;
  const isInvestmentCompleted = (user.totalInvestment || 0) >= minInvestment;
  
  // Calculate accountState in exact priority order
  let accountState = "prediction_available";
  if (!user.isActive) {
    accountState = "inactive";
  } else if (!isInvestmentCompleted) {
    accountState = "investment_pending";
  } else if (user.predictionLocked || user.monthlyMissCount >= 3) {
    accountState = "prediction_locked";
  } else {
    // Check if submitted today
    const submission = await PredictionSubmission.findOne({
      memberId: session.memberId,
      date: today,
    }).lean();

    if (submission) {
      accountState = "already_submitted";
      if (!user.predictionSubmitted || user.lastPredictionDate !== today) {
        user.predictionSubmitted = true;
        user.lastPredictionDate = today;
        await user.save();
      }
      const repairResult = await recalculateDailyReturnForUser(session.memberId, today);
      if (repairResult && repairResult.updated) {
        const updatedUser = await User.findOne({ memberId: session.memberId }).select(
          "isActive totalInvestment monthlyMissCount lastMissResetMonth currentReturnPlan predictionLocked predictionSubmitted lastPredictionDate dailyReturnPending returnsWalletBalance"
        );
        if (updatedUser) {
          user.monthlyMissCount = updatedUser.monthlyMissCount;
          user.predictionLocked = updatedUser.predictionLocked;
          user.dailyReturnPending = updatedUser.dailyReturnPending;
          user.returnsWalletBalance = updatedUser.returnsWalletBalance;
        }
      }
    } else {
      if (user.predictionSubmitted || user.lastPredictionDate === today) {
        user.predictionSubmitted = false;
        await user.save();
      }
    }
  }

  // Calculate countdownEndTime: First day of next month 00:00:00 Asia/Kolkata (Server Time)
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const nextMonthYear = nowIST.getMonth() === 11 ? nowIST.getFullYear() + 1 : nowIST.getFullYear();
  const nextMonth = nowIST.getMonth() === 11 ? 0 : nowIST.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const targetStr = `${nextMonthYear}-${pad(nextMonth + 1)}-01T00:00:00`;
  const countdownEndTime = new Date(`${targetStr}+05:30`).getTime();

  // Get today's question
  const dailyQuestion = await DailyQuestion.findOne({ date: today }).lean();

  // Get user's submission for today
  const submission = await PredictionSubmission.findOne({
    memberId: session.memberId,
    date: today,
  }).lean();

  const maxMissAllowed = settings.maximumMissAllowed ?? 3;
  const remainingFreeMisses = Math.max(0, maxMissAllowed - (user.monthlyMissCount || 0));

  // Count prediction submissions this month
  const predictionDaysCount = await PredictionSubmission.countDocuments({
    memberId: session.memberId,
    month: month,
  });

  const totalActiveInvestment = user.totalInvestment || 0;

  let effectiveRate = 0;
  if (user.predictionLocked || user.monthlyMissCount >= 3) {
    effectiveRate = 0;
  } else if (user.monthlyMissCount === 2) {
    effectiveRate = 5;
  } else {
    effectiveRate = 7;
  }

  const dailyReturn = (totalActiveInvestment * effectiveRate) / 100;

  // Calculate the actual sum of ReturnsLevelIncome for this month
  const levelIncomes = await ReturnsLevelIncome.find({
    recipientMemberId: session.memberId,
    closingMonth: month,
  }).select("calculatedAmount").lean();
  const calculatedPendingReturnsLevelIncome = levelIncomes.reduce((sum, item) => sum + (item.calculatedAmount || 0), 0);

  // Check if today's DailyReturn record already exists
  const dailyReturnRecord = await DailyReturn.findOne({ memberId: session.memberId, date: today }).lean();
  const hasDailyReturnRecordToday = !!dailyReturnRecord;

  return NextResponse.json({
    accountState,
    today,
    dailyQuestion,
    submission,
    currentReturnPlan: effectiveRate,
    monthlyMissCount: user.monthlyMissCount || 0,
    remainingFreeMisses,
    predictionLocked: user.predictionLocked || false,
    countdownEndTime,
    investmentCompleted: isInvestmentCompleted,
    isActive: user.isActive || false,
    totalActiveInvestment,
    dailyReturn,
    predictionDaysCount,
    dailyReturnPending: user.dailyReturnPending || 0,
    pendingReturnsLevelIncome: calculatedPendingReturnsLevelIncome,
    hasDailyReturnRecordToday,
  });
}

// POST: Submit answer (yes/no)
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { answer } = body;

  if (answer !== "yes" && answer !== "no") {
    return NextResponse.json({ error: "Answer must be 'yes' or 'no'" }, { status: 400 });
  }

  await connectDB();
  const today = getISTDateString();
  const month = today.slice(0, 7);

  // Get user details to verify state
  const user = await User.findOne({ memberId: session.memberId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 1. Account Active Check
  if (!user.isActive) {
    return NextResponse.json({ error: "Your Prediction Window is Locked. Activate your account." }, { status: 400 });
  }

  // 2. Investment Completed Check
  const settings = await WebsiteSettings.findOne({ key: "singleton" }) || await WebsiteSettings.create({ key: "singleton" });
  const minInvestment = settings.minimumInvestment ?? settings.pricing?.minInvestment ?? 100;
  const isInvestmentCompleted = (user.totalInvestment || 0) >= minInvestment;
  if (!isInvestmentCompleted) {
    return NextResponse.json({ error: "Daily Predictions become available only after completing the minimum investment." }, { status: 400 });
  }

  // 3. Prediction Not Locked Check
  if (user.predictionLocked) {
    return NextResponse.json({ error: "Your prediction window has been locked for the rest of this month." }, { status: 400 });
  }

  // 4. Daily Question Exists Check
  const dailyQuestion = await DailyQuestion.findOne({ date: today });
  if (!dailyQuestion) {
    return NextResponse.json({ error: "No prediction question has been generated for today yet." }, { status: 404 });
  }

  // 5. User Has Not Already Submitted Check
  const existing = await PredictionSubmission.findOne({
    memberId: session.memberId,
    date: today,
  });
  if (existing) {
    return NextResponse.json({ error: "You have already submitted your prediction for today." }, { status: 400 });
  }

  // Create submission
  try {
    const submission = await PredictionSubmission.create({
      memberId: session.memberId,
      date: today,
      month,
      answer,
      questionId: dailyQuestion.questionId,
      questionText: dailyQuestion.questionText,
    });

    user.predictionSubmitted = true;
    user.lastPredictionDate = today;
    await user.save();

    // Retroactively calculate daily return if the daily ROI cron has already run today
    await recalculateDailyReturnForUser(session.memberId, today);

    return NextResponse.json({ success: true, submission });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: "You have already submitted your prediction for today." }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Failed to submit prediction" }, { status: 500 });
  }
}
