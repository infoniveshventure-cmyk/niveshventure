import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Otp from "@/models/Otp";
import User from "@/models/User";
import { compareSecret, generateKey, getSessionFromCookies, hashSecret } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { otp, loginKey } = await req.json();
    if (!otp || !loginKey) {
      return NextResponse.json({ error: "OTP and Login Key are required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const otpDoc = await Otp.findOne({
      email: user.email,
      purpose: "access_key_change",
      consumed: false,
    }).sort({ createdAt: -1 });
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 });
    }
    const sanitizedOtp = typeof otp === "string" ? otp.trim() : "";
    const otpValid = await compareSecret(sanitizedOtp, otpDoc.codeHash);
    if (!otpValid) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    const sanitizedLoginKey = typeof loginKey === "string" ? loginKey.trim().toUpperCase() : "";
    const keyValid = await compareSecret(sanitizedLoginKey, user.loginKeyHash);
    if (!keyValid) return NextResponse.json({ error: "Login Key is incorrect" }, { status: 401 });

    const newKey = generateKey("ACC");
    user.accessKeyHash = await hashSecret(newKey);
    await user.save();
    otpDoc.consumed = true;
    await otpDoc.save();

    return NextResponse.json({ success: true, newAccessKey: newKey });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to update Access Key" }, { status: 500 });
  }
}
