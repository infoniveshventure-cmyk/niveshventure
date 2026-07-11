import { NextRequest, NextResponse } from "next/server";
import { connectDB, DatabaseConnectionError } from "@/lib/mongodb";
import Otp from "@/models/Otp";
import User from "@/models/User";
import { generateOtp, hashSecret } from "@/lib/auth-server";
import { sendMail, otpEmailTemplate } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json();
    if (!email || !purpose) {
      return NextResponse.json({ error: "email and purpose are required" }, { status: 400 });
    }

    try {
      await connectDB();
    } catch (error) {
      if (error instanceof DatabaseConnectionError) {
        return NextResponse.json(
          {
            error:
              "Database is temporarily unavailable. Please ensure your MongoDB Atlas cluster allows your current IP address and that MONGODB_URI is configured correctly.",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    if (purpose === "register") {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
      }
    } else if (purpose !== "change_email") {
      // For any purpose other than register or change_email, the email must already exist in MongoDB
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (!existing) {
        return NextResponse.json({ error: "Email address is not registered" }, { status: 404 });
      }
    }

    const code = generateOtp();
    const codeHash = await hashSecret(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({ email: email.toLowerCase(), codeHash, purpose, expiresAt });
    await sendMail(email, "Your verification code", otpEmailTemplate(code));

    return NextResponse.json({ success: true, message: "OTP sent to your email" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to send OTP" }, { status: err instanceof DatabaseConnectionError ? 503 : 500 });
  }
}
