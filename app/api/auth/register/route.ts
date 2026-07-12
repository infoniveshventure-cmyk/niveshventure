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
import {
  createFirebaseUser,
  deleteFirebaseUser,
  createFirebaseCustomToken,
} from "@/lib/firebase-admin";
import { notifyMember } from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, mobile, email, country, otp, sponsorId, position, password } = body;

    if (!fullName || !mobile || !email || !country || !otp || !password || !sponsorId) {
      return NextResponse.json({ error: "Missing required fields (including Sponsor ID)" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await connectDB();

    const settings = await WebsiteSettings.findOne({ key: "singleton" });
    if (settings) {
      if (settings.maintenanceMode === false) {
        return NextResponse.json({ error: settings.secretMaintenanceMessage || "Registration is temporarily closed." }, { status: 503 });
      }
      if (settings.websiteEnabled === false) {
        return NextResponse.json({ error: settings.maintenanceMessage || "Registration is temporarily closed." }, { status: 503 });
      }
    }

    // 1. Verify OTP first — before creating any Firebase account.
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

    // 2. Check that no completed registration exists in MongoDB.
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // 3. Mark OTP consumed only after all checks pass.
    otpDoc.consumed = true;
    await otpDoc.save();

    // 4. Resolve sponsor placement.
    if (!sponsorId) {
      return NextResponse.json({ error: "Sponsor ID is required" }, { status: 400 });
    }
    const sponsor = await User.findOne({ memberId: sponsorId });
    if (!sponsor) {
      return NextResponse.json({ error: "Referral code (Sponsor ID) not found" }, { status: 400 });
    }
    let parentId = sponsor.memberId;

    // 5. Create the Firebase Auth account server-side (only now, after OTP verified).
    //    If this fails (e.g. email already in Firebase from an old abandoned attempt),
    //    try to delete the stale Firebase account first then retry once.
    let firebaseUser;
    try {
      firebaseUser = await createFirebaseUser(email.toLowerCase(), password);
    } catch (firebaseErr: any) {
      if (firebaseErr?.code === "auth/email-already-exists") {
        // A stale Firebase account exists from a previous incomplete registration.
        // The Admin SDK lets us look it up and delete it, then recreate.
        const { getAuth } = await import("firebase-admin/auth");
        const { initializeApp, getApps, cert } = await import("firebase-admin/app");
        const adminApps = getApps();
        const adminAuth = getAuth(adminApps[0]);
        try {
          const staleUser = await adminAuth.getUserByEmail(email.toLowerCase());
          await adminAuth.deleteUser(staleUser.uid);
          // Retry creation
          firebaseUser = await createFirebaseUser(email.toLowerCase(), password);
        } catch {
          return NextResponse.json(
            { error: "Could not create authentication account. Please try again." },
            { status: 500 }
          );
        }
      } else {
        throw firebaseErr;
      }
    }

    const memberId = generateMemberId();
    const loginKey = generateKey("LGN");
    const accessKey = generateKey("ACC");
    const loginKeyHash = await hashSecret(loginKey);
    const accessKeyHash = await hashSecret(accessKey);

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = adminEmail ? email.toLowerCase() === adminEmail : false;

    let user;
    try {
      user = await User.create({
        memberId,
        firebaseUid: firebaseUser.uid,
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
    } catch (dbErr) {
      // Rollback: delete the Firebase account so the email is not locked
      await deleteFirebaseUser(firebaseUser.uid);
      throw dbErr;
    }

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

    // 6. Create a custom Firebase token so the client can sign in immediately.
    const customToken = await createFirebaseCustomToken(firebaseUser.uid);

    const token = signSession({ memberId: user.memberId, role: "member" });
    const res = NextResponse.json({
      success: true,
      memberId: user.memberId,
      customToken,
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
