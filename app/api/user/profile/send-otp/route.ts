import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth-server";
import Otp from "@/models/Otp";
import User from "@/models/User";
import { generateOtp, hashSecret } from "@/lib/auth-server";
import { sendMail, otpEmailTemplate } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { type, newValue } = await req.json();
    if (!type || !newValue) {
      return NextResponse.json({ error: "type and newValue are required" }, { status: 400 });
    }

    if (type !== "email" && type !== "mobile") {
      return NextResponse.json({ error: "type must be 'email' or 'mobile'" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const cleanValue = newValue.trim();

    // 1. Validation & Uniqueness checks
    if (type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanValue)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }

      // Check if email is already taken in MongoDB
      const existingUser = await User.findOne({ email: cleanValue.toLowerCase(), memberId: { $ne: session.memberId } });
      if (existingUser) {
        return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
      }

      // Send OTP directly to the NEW email address to verify it
      const code = generateOtp();
      const codeHash = await hashSecret(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await Otp.create({
        email: cleanValue.toLowerCase(),
        codeHash,
        purpose: "change_email",
        expiresAt,
      });

      await sendMail(
        cleanValue,
        "Verify your new email address",
        otpEmailTemplate(code)
      );

      return NextResponse.json({ success: true, message: "OTP sent to your new email address" });
    } else {
      // type === "mobile"
      if (cleanValue.length < 7) {
        return NextResponse.json({ error: "Phone number is too short" }, { status: 400 });
      }

      // Check if phone number is already taken in MongoDB
      const existingUser = await User.findOne({ mobile: cleanValue, memberId: { $ne: session.memberId } });
      if (existingUser) {
        return NextResponse.json({ error: "Phone number is already in use by another account" }, { status: 400 });
      }

      // Send OTP to the CURRENT email address to authorize the phone change
      const code = generateOtp();
      const codeHash = await hashSecret(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await Otp.create({
        email: user.email.toLowerCase(),
        codeHash,
        purpose: "change_mobile",
        expiresAt,
      });

      await sendMail(
        user.email,
        "Verify phone number change request",
        otpEmailTemplate(code)
      );

      return NextResponse.json({ success: true, message: "OTP sent to your registered email address" });
    }
  } catch (err: any) {
    console.error("send profile otp error:", err);
    return NextResponse.json({ error: err.message || "Failed to send verification code" }, { status: 500 });
  }
}
