import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth-server";
import DailyQuestion from "@/models/DailyQuestion";
import PredictionSubmission from "@/models/PredictionSubmission";
import User from "@/models/User";
import BusinessRule from "@/models/BusinessRule";
import { getISTDateString } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// GET: Fetch today's question and the user's submission state
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const today = getISTDateString();
  const month = today.slice(0, 7);

  // Get user details
  const user = await User.findOne({ memberId: session.memberId }).select(
    "monthlyMissCount lastMissResetMonth currentReturnPlan productionStatus"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Reset check (safeguard / month change logic)
  if (user.lastMissResetMonth !== month) {
    // Fetch completed rate rule (for reset)
    const completedRule = await BusinessRule.findOne({ key: "production_completed_monthly_rate" });
    const completedRate = completedRule ? Number(completedRule.value) : 7;

    user.monthlyMissCount = 0;
    user.currentReturnPlan = completedRate;
    user.productionStatus = "active";
    user.lastMissResetMonth = month;
    await user.save();
  }

  // Get prediction_free_misses rule
  const freeMissesRule = await BusinessRule.findOne({ key: "prediction_free_misses" });
  const freeMisses = freeMissesRule ? Number(freeMissesRule.value) : 3;

  // Get today's question
  const dailyQuestion = await DailyQuestion.findOne({ date: today }).lean();

  // Get user's submission for today
  const submission = await PredictionSubmission.findOne({
    memberId: session.memberId,
    date: today,
  }).lean();

  return NextResponse.json({
    today,
    dailyQuestion,
    submission,
    monthlyMissCount: user.monthlyMissCount || 0,
    freeMisses,
    remainingFreeMisses: Math.max(0, freeMisses - (user.monthlyMissCount || 0)),
    productionStatus: user.productionStatus || "active",
    currentReturnPlan: user.currentReturnPlan || 7,
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

  // Get user details to verify productionStatus
  const user = await User.findOne({ memberId: session.memberId }).select("productionStatus");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 6. Prediction Submission Restriction
  if (user.productionStatus === "closed") {
    return NextResponse.json(
      { error: "Production Closed - User is on 5% Plan" },
      { status: 400 }
    );
  }

  const today = getISTDateString();
  const month = today.slice(0, 7);

  // Get today's question
  const dailyQuestion = await DailyQuestion.findOne({ date: today });
  if (!dailyQuestion) {
    return NextResponse.json({ error: "No prediction question has been generated for today yet." }, { status: 404 });
  }

  // Check if already submitted today
  const existing = await PredictionSubmission.findOne({
    memberId: session.memberId,
    date: today,
  });

  if (existing) {
    return NextResponse.json({ error: "You have already submitted your prediction for today." }, { status: 400 });
  }

  // Create submission
  const submission = await PredictionSubmission.create({
    memberId: session.memberId,
    date: today,
    month,
    answer,
    questionId: dailyQuestion.questionId,
    questionText: dailyQuestion.questionText,
  });

  return NextResponse.json({ success: true, submission });
}
