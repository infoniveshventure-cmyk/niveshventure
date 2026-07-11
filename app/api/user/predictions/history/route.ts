import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth-server";
import PredictionSubmission from "@/models/PredictionSubmission";
import DailyReturn from "@/models/DailyReturn";
import ReturnsLevelIncome from "@/models/ReturnsLevelIncome";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();

  // Fetch all prediction submissions for this user
  const submissions = await PredictionSubmission.find({ memberId: session.memberId })
    .sort({ date: -1 })
    .limit(100)
    .lean();

  // Fetch all daily returns for this user
  const dailyReturns = await DailyReturn.find({ memberId: session.memberId })
    .sort({ date: -1 })
    .limit(100)
    .lean();

  // Fetch all returns level income records received by this user
  const levelIncomes = await ReturnsLevelIncome.find({ recipientMemberId: session.memberId })
    .sort({ calculationDate: -1 })
    .limit(200)
    .lean();

  // Merge them by date
  const historyMap = new Map<string, any>();

  // 1. Add submissions
  for (const sub of submissions) {
    historyMap.set(sub.date, {
      date: sub.date,
      questionText: sub.questionText,
      answer: sub.answer,
      submittedAt: sub.submittedAt || sub.createdAt,
      roiProfit: 0,
      levelIncome: 0,
    });
  }

  // 2. Add ROI profits
  for (const ret of dailyReturns) {
    const existing = historyMap.get(ret.date) || {
      date: ret.date,
      questionText: "N/A",
      answer: "No Prediction",
      submittedAt: null,
      roiProfit: 0,
      levelIncome: 0,
    };
    existing.roiProfit = ret.profit || 0;
    historyMap.set(ret.date, existing);
  }

  // 3. Add Level incomes (grouped by date)
  for (const lvl of levelIncomes) {
    const dateStr = lvl.calculationDate;
    const existing = historyMap.get(dateStr) || {
      date: dateStr,
      questionText: "N/A",
      answer: "N/A",
      submittedAt: null,
      roiProfit: 0,
      levelIncome: 0,
    };
    existing.levelIncome = (existing.levelIncome || 0) + (lvl.calculatedAmount || 0);
    historyMap.set(dateStr, existing);
  }

  const historyList = Array.from(historyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ history: historyList });
}
