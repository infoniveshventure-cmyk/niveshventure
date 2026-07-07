import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * PUT /api/user/profile
 * Allows users to update their own profile info: fullName, email, mobile
 */
export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { fullName, email, mobile } = await req.json();

    if (!fullName || !email) {
      return NextResponse.json({ error: "Full Name and Email are required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, memberId: { $ne: session.memberId } });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
    }

    user.fullName = fullName.trim();
    user.email = email.trim().toLowerCase();
    user.mobile = mobile ? mobile.trim() : "";

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (err: any) {
    console.error("profile update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}
