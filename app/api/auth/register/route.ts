import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Otp from "@/models/Otp";
import User from "@/models/User";
import WebsiteSettings from "@/models/WebsiteSettings";
import {
  compareSecret,
  generateKey,
  generateMemberId,
  hashSecret,
  signSession,
  SESSION_COOKIE,
} from "@/lib/auth-server";
import { sendMail, welcomeEmailTemplate } from "@/lib/mailer";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { notifyMember } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, mobile, email, country, otp, sponsorId, position, firebaseIdToken } = body;

    if (!fullName || !mobile || !email || !country || !otp || !firebaseIdToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const settings = await WebsiteSettings.findOne({ key: "singleton" });
    if (settings && settings.websiteEnabled === false) {
      return NextResponse.json({ error: settings.maintenanceMessage || "Registration is temporarily closed." }, { status: 503 });
    }

    // Verify Firebase identity (email/password account already created client-side).
    const decoded = await verifyFirebaseToken(firebaseIdToken);
    if (decoded.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match verified account" }, { status: 400 });
    }

    // Verify OTP.
    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: "register",
      consumed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP expired. Request a new one." }, { status: 400 });
    }
    const valid = await compareSecret(otp, otpDoc.codeHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }
    otpDoc.consumed = true;
    await otpDoc.save();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Resolve sponsor placement.
    let parentId: string | null = null;
    if (sponsorId) {
      const sponsor = await User.findOne({ memberId: sponsorId });
      if (!sponsor) {
        return NextResponse.json({ error: "Referral code not found" }, { status: 400 });
      }
      parentId = sponsor.memberId;
    }

    const memberId = generateMemberId();
    const loginKey = generateKey("LGN");
    const accessKey = generateKey("ACC");
    const loginKeyHash = await hashSecret(loginKey);
    const accessKeyHash = await hashSecret(accessKey);

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = adminEmail ? email.toLowerCase() === adminEmail : false;

    const user = await User.create({
      memberId,
      firebaseUid: decoded.uid,
      fullName,
      mobile,
      email: email.toLowerCase(),
      country,
      sponsorId: sponsorId || null,
      position: position || null,
      parentId,
      accessKeyHash,
      loginKeyHash,
      role: isAdmin ? "admin" : "member",
    });

    await sendMail(
      email,
      "Welcome — Your account is ready",
      welcomeEmailTemplate({ fullName, memberId, loginKey, accessKey })
    );

    // Notifications
    try {
      await notifyMember(
        memberId,
        "Welcome to Nivesh Ventures! 🎉",
        `Your account has been created successfully. Your Member ID is ${memberId}.`,
        "registration"
      );
      // Notify sponsor if exists
      if (sponsorId) {
        await notifyMember(
          sponsorId,
          "New Referral Joined! 👥",
          `${fullName} has joined Nivesh Ventures using your referral link.`,
          "referral_joined"
        );
      }
    } catch (notifyErr) {
      console.error("Notification error:", notifyErr);
    }

    const token = signSession({ memberId: user.memberId, role: "member" });
    const res = NextResponse.json({
      success: true,
      memberId: user.memberId,
      message: "Registration complete. Check your email for your Member ID, Login Key and Access Key.",
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
