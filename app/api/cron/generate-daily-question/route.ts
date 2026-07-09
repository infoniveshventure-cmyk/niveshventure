import { NextRequest, NextResponse } from "next/server";
import { runGenerateDailyQuestion } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// Called by system cron at 12:00 AM IST daily
// Header: x-cron-secret
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runGenerateDailyQuestion();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[generate-daily-question cron]", err);
    return NextResponse.json(
      { error: "Failed to generate daily question", detail: err.message },
      { status: 500 }
    );
  }
}
