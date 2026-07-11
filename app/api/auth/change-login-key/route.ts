import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Otp from "@/models/Otp";
import User from "@/models/User";
import { compareSecret, generateKey, getSessionFromCookies, hashSecret } from "@/lib/auth-server";
import { notifyMember } from "@/lib/notification";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { otp, currentLoginKey } = await req.json();
    if (!otp || !currentLoginKey) {
      return NextResponse.json({ error: "OTP and current Login Key are required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const otpDoc = await Otp.findOne({
      email: user.email,
      purpose: "login_key_change",
      consumed: false,
    }).sort({ createdAt: -1 });
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 });
    }
    const sanitizedOtp = typeof otp === "string" ? otp.trim() : "";
    const otpValid = await compareSecret(sanitizedOtp, otpDoc.codeHash);
    if (!otpValid) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    const sanitizedCurrentLoginKey = typeof currentLoginKey === "string" ? currentLoginKey.trim().toUpperCase() : "";
    const keyValid = await compareSecret(sanitizedCurrentLoginKey, user.loginKeyHash);
    if (!keyValid) return NextResponse.json({ error: "Current Login Key is incorrect" }, { status: 401 });

    const newKey = generateKey("LGN");
    user.loginKeyHash = await hashSecret(newKey);
    await user.save();
    otpDoc.consumed = true;
    await otpDoc.save();

    notifyMember(
      user.memberId,
      "Login Key Changed 🔑",
      "Your login key has been changed successfully. If you did not do this, please contact support immediately.",
      "password_changed"
    ).catch(() => {});

    return NextResponse.json({ success: true, newLoginKey: newKey });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to update Login Key" }, { status: 500 });
  }
}
