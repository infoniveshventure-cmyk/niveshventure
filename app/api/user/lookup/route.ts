import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/lookup?memberId=NV123456
 * Returns the full name of a user by member ID (for P2P receiver verification).
 * Only accessible to authenticated users.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const memberId = req.nextUrl.searchParams.get("memberId")?.trim();
  if (!memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });

  // Prevent looking up yourself
  if (memberId === session.memberId) {
    return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ memberId }).select("fullName memberId isActive").lean() as any;
  if (!user) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({
    memberId: user.memberId,
    fullName: user.fullName,
    isActive: user.isActive,
  });
}
