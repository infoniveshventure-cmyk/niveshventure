import { NextRequest, NextResponse } from "next/server";
import { runDailyReturn } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// Called by system cron at 12:00 PM daily
// Header: x-cron-secret: <CRON_SECRET env var>
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyReturn();
    
    // Trigger daily Returns Level Income calculation
    let levelIncomeResult = {};
    try {
      const { calculateDailyReturnsLevelIncome } = await import("@/lib/returnsLevelIncome");
      levelIncomeResult = await calculateDailyReturnsLevelIncome();
    } catch (lvlErr: any) {
      console.error("[daily-return cron] Returns Level Income calculation failed:", lvlErr);
    }

    return NextResponse.json({ success: true, ...result, levelIncomeResult });
  } catch (err: any) {
    console.error("[daily-return cron]", err);
    return NextResponse.json(
      { error: "Failed to run daily return", detail: err.message },
      { status: 500 }
    );
  }
}
