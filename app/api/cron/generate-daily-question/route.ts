import { NextRequest, NextResponse } from "next/server";
import { runGenerateDailyQuestion } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// Called by system cron at 12:00 AM IST daily
// Header: x-cron-secret
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
  return handleGenerateDailyQuestion();
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleGenerateDailyQuestion();
}

async function handleGenerateDailyQuestion() {

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
