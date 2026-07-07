import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Investment from "@/models/Investment";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/lookup?memberId=NV123456&purpose=activation
 * Returns the details of a user by member ID.
 * Only accessible to authenticated users.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const memberId = req.nextUrl.searchParams.get("memberId")?.trim();
  const purpose = req.nextUrl.searchParams.get("purpose")?.trim() || "p2p";

  if (!memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });

  // Prevent looking up yourself only for P2P transfers
  if (purpose === "p2p" && memberId === session.memberId) {
    return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ memberId }).select("fullName memberId isActive totalInvestment").lean() as any;
  if (!user) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  let activeInvestments: any[] = [];
  if (purpose === "investment") {
    activeInvestments = await Investment.find({ memberId, status: "active" }).select("amount createdAt").lean();
  }

  return NextResponse.json({
    memberId: user.memberId,
    fullName: user.fullName,
    isActive: user.isActive,
    totalInvestment: user.totalInvestment || 0,
    activeInvestments,
  });
}
