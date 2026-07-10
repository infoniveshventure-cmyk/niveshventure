import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/require-admin";
import PredictionQuestion from "@/models/PredictionQuestion";
import DailyQuestion from "@/models/DailyQuestion";
import PredictionSubmission from "@/models/PredictionSubmission";
import User from "@/models/User";
import WebsiteSettings from "@/models/WebsiteSettings";
import { getISTDateString, runGenerateDailyQuestion } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();
  const today = getISTDateString();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";

  // 1. Fetch Today's Question + Submission Stats
  if (action === "stats") {
    const dailyQuestion = await DailyQuestion.findOne({ date: today }).lean();
    
    // Count YES/NO
    const yesCount = await PredictionSubmission.countDocuments({ date: today, answer: "yes" });
    const noCount = await PredictionSubmission.countDocuments({ date: today, answer: "no" });
    const totalSubmissions = yesCount + noCount;

    // Fetch all active members to find out who hasn't submitted yet
    const activeMembersCount = await User.countDocuments({ role: "member", isActive: true });
    const pendingCount = Math.max(0, activeMembersCount - totalSubmissions);

    const settings = await WebsiteSettings.findOne({ key: "singleton" }) || await WebsiteSettings.create({ key: "singleton" });

    return NextResponse.json({
      today,
      dailyQuestion,
      settings,
      stats: {
        yesCount,
        noCount,
        totalSubmissions,
        pendingCount,
        activeMembersCount,
      }
    });
  }

  // 2. Fetch submissions history
  if (action === "submissions") {
    const submissions = await PredictionSubmission.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ submissions });
  }

  // 3. Default: return all library questions
  const library = await PredictionQuestion.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ library });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { action, questionText, status, questionId, targetDate, manualOverrideQuestion, memberId, newMissCount } = body;

  await connectDB();
  const today = getISTDateString();

  // A. Add a question to library
  if (action === "add_question") {
    if (!questionText) return NextResponse.json({ error: "questionText is required" }, { status: 400 });
    const q = await PredictionQuestion.create({
      questionText,
      status: status || "active",
      createdBy: "admin",
    });
    return NextResponse.json({ success: true, question: q });
  }

  // B. Edit a question
  if (action === "edit_question") {
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    const q = await PredictionQuestion.findById(questionId);
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    if (questionText !== undefined) q.questionText = questionText;
    if (status !== undefined) q.status = status;
    await q.save();

    return NextResponse.json({ success: true, question: q });
  }

  // C. Delete a question
  if (action === "delete_question") {
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    await PredictionQuestion.findByIdAndDelete(questionId);
    return NextResponse.json({ success: true });
  }

  // D. Manually replace today's question
  if (action === "replace_today_question") {
    if (!manualOverrideQuestion) return NextResponse.json({ error: "manualOverrideQuestion is required" }, { status: 400 });
    
    let dailyQuestion = await DailyQuestion.findOne({ date: today });
    if (!dailyQuestion) {
      dailyQuestion = new DailyQuestion({
        date: today,
        questionText: manualOverrideQuestion,
        isManual: true,
      });
    } else {
      dailyQuestion.questionText = manualOverrideQuestion;
      dailyQuestion.isManual = true;
    }
    await dailyQuestion.save();

    return NextResponse.json({ success: true, question: dailyQuestion });
  }

  // E. Trigger Daily Question Generation (Admin override)
  if (action === "trigger_generation") {
    const result = await runGenerateDailyQuestion(targetDate || undefined);
    return NextResponse.json(result);
  }

  // F. Super admin manual eligibility / miss override
  if (action === "override_miss_count") {
    if (!memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    const user = await User.findOne({ memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.monthlyMissCount = Number(newMissCount ?? 0);
    await user.save();

    return NextResponse.json({ success: true, user });
  }

  // G. Reset Today's Question
  if (action === "reset_today_question") {
    await DailyQuestion.deleteOne({ date: today });
    return NextResponse.json({ success: true });
  }

  // H. Save Auto Schedule (Pending Question)
  if (action === "save_auto_schedule") {
    if (!questionText) return NextResponse.json({ error: "questionText is required" }, { status: 400 });
    const settings = await WebsiteSettings.findOne({ key: "singleton" }) || await WebsiteSettings.create({ key: "singleton" });
    settings.nextScheduledQuestion = questionText;
    await settings.save();
    return NextResponse.json({ success: true, settings });
  }

  // I. Toggle Auto Prediction
  if (action === "toggle_auto_prediction") {
    const settings = await WebsiteSettings.findOne({ key: "singleton" }) || await WebsiteSettings.create({ key: "singleton" });
    settings.autoPredictionEnabled = body.enabled === true;
    await settings.save();
    return NextResponse.json({ success: true, settings });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
