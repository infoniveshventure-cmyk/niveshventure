import { NextRequest, NextResponse } from "next/server";
import { runMonthlySettlement } from "@/lib/dailyReturn";

export const dynamic = "force-dynamic";

// Called by system cron on the 1st of every month
// Header: x-cron-secret: <CRON_SECRET env var>
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  try {
    const result = await runMonthlySettlement(force);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[monthly-settlement cron]", err);
    return NextResponse.json(
      { error: "Failed to run monthly settlement", detail: err.message },
      { status: 500 }
    );
  }
}
