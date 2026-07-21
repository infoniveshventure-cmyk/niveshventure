import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth-server";
import ReturnsLevelIncome from "@/models/ReturnsLevelIncome";
import User from "@/models/User"; // Ensure registered so population works

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();

  // Fetch detailed level return records populated with downline user's name
  const levelIncomes = await ReturnsLevelIncome.find({ recipientMemberId: session.memberId })
    .populate("downlineUserId", "fullName")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const records = levelIncomes.map((lvl: any) => ({
    id: lvl._id,
    date: lvl.calculationDate,
    downlineMemberId: lvl.downlineMemberId,
    downlineName: lvl.downlineUserId?.fullName || "Unknown",
    level: lvl.level,
    percentage: lvl.percentage,
    amount: lvl.calculatedAmount,
    status: lvl.status || "Pending",
  }));

  return NextResponse.json({ records });
}
