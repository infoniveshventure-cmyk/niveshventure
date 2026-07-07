import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session?.memberId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectDB();
    const WebsiteSettings = (await import("@/models/WebsiteSettings")).default;
    const settings = await WebsiteSettings.findOne({ key: "singleton" }).select("maintenanceMode secretMaintenanceMessage").lean();
    if (settings && settings.maintenanceMode === false) {
      return NextResponse.json({ error: settings.secretMaintenanceMessage || "System is under maintenance." }, { status: 503 });
    }

    const user = await User.findOne({ memberId: session.memberId }).select(
      "memberId fullName email role rank isActive walletBalance totalReferralIncome totalMatchingIncome totalReturnsIncome totalLevelIncome totalRewardIncome totalInvestment totalWithdrawn firstDepositRewarded"
    ).lean();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("/api/auth/me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
