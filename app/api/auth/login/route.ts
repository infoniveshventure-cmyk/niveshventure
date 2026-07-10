import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getCachedSettings } from "@/lib/settingsCache";
import { signSession, SESSION_COOKIE } from "@/lib/auth-server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { notifyMember } from "@/lib/notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { firebaseIdToken } = await req.json();
    if (!firebaseIdToken) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    await connectDB();
    let decoded;
    try {
      decoded = await verifyFirebaseToken(firebaseIdToken);
    } catch (verifyError: any) {
      console.error("Firebase token verification failed:", verifyError);
      return NextResponse.json(
        {
          error: "Invalid Firebase ID token.",
          code: verifyError.code || "auth/invalid-token",
          message: verifyError.message,
        },
        { status: 401 }
      );
    }
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Invalid Firebase token payload" }, { status: 401 });
    }
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase() });
    }
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Block check — hard blocked users cannot log in
    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Your account has been blocked. Please contact support for assistance." },
        { status: 403 }
      );
    }

    // Auto-assign admin role for configured admin email
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && decoded.email?.toLowerCase() === adminEmail && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    // Maintenance gate — blocks non-admin logins when site is switched off.
    const settings = await getCachedSettings();
    if (settings) {
      if (settings.maintenanceMode === false) {
        return NextResponse.json({ error: settings.secretMaintenanceMessage || "Website is temporarily offline." }, { status: 503 });
      }
      if (settings.websiteEnabled === false && user.role !== "admin") {
        return NextResponse.json({ error: settings.maintenanceMessage || "Website is temporarily offline. Only administrator login is accepted." }, { status: 503 });
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Login notification (async, don't block)
    notifyMember(
      user.memberId,
      "New Login Detected",
      `Your account was accessed. If this wasn't you, please contact support immediately.`,
      "login"
    ).catch(() => {});

    const token = signSession({ memberId: user.memberId, role: user.role });
    const res = NextResponse.json({ success: true, memberId: user.memberId, role: user.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (err: any) {
    const envDebug = {
      firebaseAdminProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      firebaseAdminClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      firebaseAdminPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      firebasePublicProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      jwtSecret: !!process.env.JWT_SECRET,
      mongodbUri: !!process.env.MONGODB_URI,
    };
    console.error("/api/auth/login error:", {
      message: err?.message || err,
      stack: err?.stack || "",
      env: envDebug,
    });
    return NextResponse.json(
      {
        error: err?.message || "Login failed",
        code: err?.code || null,
        env: envDebug,
        stack: process.env.NODE_ENV !== "production" ? err?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
