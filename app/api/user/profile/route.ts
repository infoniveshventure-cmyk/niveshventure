import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { getSessionFromCookies, compareSecret } from "@/lib/auth-server";
import { updateFirebaseUser } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { fullName, email, mobile, emailOtp, mobileOtp } = await req.json();

    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const originalEmail = user.email;
    const originalMobile = user.mobile;
    const originalFullName = user.fullName;

    let emailChanged = false;
    let mobileChanged = false;
    let nameChanged = false;

    // ── 1. Validate & process Name Change ──
    if (fullName && fullName.trim() !== originalFullName) {
      nameChanged = true;
    }

    // ── 2. Validate & process Email Change (Direct change without OTP) ──
    const targetEmail = email ? email.trim().toLowerCase() : originalEmail;
    if (targetEmail !== originalEmail) {
      // Check duplicate email
      const duplicateUser = await User.findOne({ email: targetEmail, memberId: { $ne: session.memberId } });
      if (duplicateUser) {
        return NextResponse.json({ error: "New email address is already in use by another account" }, { status: 400 });
      }
      emailChanged = true;
    }

    // ── 3. Validate & process Mobile Change (Direct change without OTP) ──
    const targetMobile = mobile ? mobile.trim() : originalMobile;
    if (targetMobile !== originalMobile) {
      // Check duplicate mobile
      const duplicateUser = await User.findOne({ mobile: targetMobile, memberId: { $ne: session.memberId } });
      if (duplicateUser) {
        return NextResponse.json({ error: "New phone number is already in use by another account" }, { status: 400 });
      }
      mobileChanged = true;
    }

    // ── 4. Apply Changes to Firebase Auth & MongoDB with Rollback ──
    const firebaseUpdates: any = {};
    if (nameChanged) firebaseUpdates.displayName = fullName.trim();
    if (emailChanged) firebaseUpdates.email = targetEmail;
    
    // Firebase phone number requires E.164 format (must start with +). If it starts with +, try updating it.
    if (mobileChanged && targetMobile.startsWith("+")) {
      firebaseUpdates.phoneNumber = targetMobile;
    }

    let firebaseSuccess = false;
    try {
      if (Object.keys(firebaseUpdates).length > 0 && user.firebaseUid) {
        await updateFirebaseUser(user.firebaseUid, firebaseUpdates);
        firebaseSuccess = true;
      }
    } catch (fbError: any) {
      console.error("Firebase update failed during profile modification:", fbError);
      return NextResponse.json({
        error: `Authentication server sync failed: ${fbError.message || "Invalid update properties"}`
      }, { status: 400 });
    }

    try {
      // Apply updates to MongoDB
      if (nameChanged) user.fullName = fullName.trim();
      if (emailChanged) user.email = targetEmail;
      if (mobileChanged) user.mobile = targetMobile;

      await user.save();
    } catch (mongoError: any) {
      console.error("MongoDB save failed, executing rollback:", mongoError);
      
      // Rollback Firebase updates if MongoDB save fails
      if (firebaseSuccess && user.firebaseUid) {
        const rollbackProps: any = {};
        if (nameChanged) rollbackProps.displayName = originalFullName;
        if (emailChanged) rollbackProps.email = originalEmail;
        if (mobileChanged && originalMobile.startsWith("+")) {
          rollbackProps.phoneNumber = originalMobile;
        }
        try {
          await updateFirebaseUser(user.firebaseUid, rollbackProps);
        } catch (rollError) {
          console.error("Critical: Firebase rollback failed:", rollError);
        }
      }

      return NextResponse.json({ error: "Failed to save profile changes. Action rolled back." }, { status: 500 });
    }

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
    console.error("profile update route error:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}
