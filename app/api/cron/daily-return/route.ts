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
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[daily-return cron]", err);
    return NextResponse.json(
      { error: "Failed to run daily return", detail: err.message },
      { status: 500 }
    );
  }
}
