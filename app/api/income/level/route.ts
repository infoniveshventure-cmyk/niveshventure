import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth-server";
import ReturnsLevelIncome from "@/models/ReturnsLevelIncome";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  
  // Find all level-wise returns commissions matching recipientMemberId
  const list = await ReturnsLevelIncome.find({ recipientMemberId: session.memberId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ list });
}
