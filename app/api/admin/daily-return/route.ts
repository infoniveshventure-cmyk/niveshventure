import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BusinessRule from "@/models/BusinessRule";
import DailyReturn from "@/models/DailyReturn";
import { requireAdmin } from "@/lib/require-admin";
import { runDailyReturn, runMonthlySettlement } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// GET: Config + recent records overview
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 50;

  // Fetch live config
  const [modeRule, monthlyPctRule, manualPctRule] = await Promise.all([
    BusinessRule.findOne({ key: "daily_return_mode" }),
    BusinessRule.findOne({ key: "daily_return_monthly_pct" }),
    BusinessRule.findOne({ key: "daily_return_manual_pct" }),
  ]);

  const mode = modeRule ? String(modeRule.value) : "auto";
  const monthlyPct = monthlyPctRule ? Number(monthlyPctRule.value) : 6;
  const manualDailyPct = manualPctRule ? Number(manualPctRule.value) : 0.2;
  const effectiveDailyPct = mode === "auto" ? monthlyPct : manualDailyPct;

  // Build query for records
  const query: any = {};
  if (memberId) query.memberId = { $regex: memberId, $options: "i" };
  if (dateFrom) query.date = { $gte: dateFrom };
  if (dateTo) query.date = { ...query.date, $lte: dateTo };

  const [records, total] = await Promise.all([
    DailyReturn.find(query)
      .sort({ date: -1, memberId: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DailyReturn.countDocuments(query),
  ]);

  // Stats
  const totalPendingAgg = await DailyReturn.aggregate([
    { $match: { settled: false } },
    { $group: { _id: null, total: { $sum: "$profit" }, members: { $addToSet: "$memberId" } } },
  ]);
  const totalSettledAgg = await DailyReturn.aggregate([
    { $match: { settled: true } },
    { $group: { _id: null, total: { $sum: "$profit" } } },
  ]);

  return NextResponse.json({
    config: {
      mode,
      monthlyPct,
      manualDailyPct,
      effectiveDailyPct: parseFloat(effectiveDailyPct.toFixed(6)),
    },
    stats: {
      totalPending: totalPendingAgg[0]?.total ?? 0,
      pendingMembersCount: totalPendingAgg[0]?.members?.length ?? 0,
      totalSettled: totalSettledAgg[0]?.total ?? 0,
    },
    records,
    pagination: { page, total, pages: Math.ceil(total / limit) },
  });
}

// POST: Admin manual triggers
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  const { action, date } = body;

  if (action === "trigger_daily") {
    try {
      const result = await runDailyReturn(date || undefined);
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json(
        { error: "Daily return failed", detail: err.message },
        { status: 500 }
      );
    }
  }

  if (action === "trigger_settlement") {
    try {
      const result = await runMonthlySettlement(true); // force = true for admin
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json(
        { error: "Settlement failed", detail: err.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
