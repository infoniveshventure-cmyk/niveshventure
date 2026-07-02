import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  // Env‑based admin (role already "admin" in JWT)
  if (session.role === "admin") {
    return { session };
  }

  // Fallback: check DB for admin role
  await connectDB();
  const dbUser = await User.findOne({ memberId: session.memberId }).select("role");
  if (dbUser?.role === "admin") {
    // Promote session to admin for this request
    (session as any).role = "admin";
    return { session };
  }

  return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
}
