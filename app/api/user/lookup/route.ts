import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId parameter is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId }).select("fullName");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ fullName: user.fullName });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to look up user" }, { status: 500 });
  }
}
