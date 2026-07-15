import { NextRequest, NextResponse } from "next/server";
import { runDailyReturn } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// Called by system cron at 12:00 PM daily
// Header: x-cron-secret: <CRON_SECRET env var>
function verifySecret(req: NextRequest): boolean {
  const customSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const bearerSecret = authHeader ? authHeader.replace("Bearer ", "").trim() : null;

  return (
    customSecret === process.env.CRON_SECRET ||
    bearerSecret === process.env.CRON_SECRET
  );
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleDailyReturn();
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleDailyReturn();
}

async function handleDailyReturn() {

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
