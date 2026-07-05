import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sponsorId = req.nextUrl.searchParams.get("sponsorId");
    if (!sponsorId) {
      return NextResponse.json({ error: "sponsorId parameter is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId: sponsorId.toUpperCase() }).select("fullName");
    if (!user) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    return NextResponse.json({ fullName: user.fullName });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to look up sponsor" }, { status: 500 });
  }
}
