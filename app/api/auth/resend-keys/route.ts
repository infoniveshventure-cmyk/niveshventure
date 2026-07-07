import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateKey, getSessionFromCookies, hashSecret } from "@/lib/auth-server";
import { sendMail, welcomeEmailTemplate } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/resend-keys
 * Generates fresh Login Key + Access Key, stores hashes, and emails plain-text keys to the user.
 * Only usable by the authenticated user themselves.
 */
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await connectDB();
    const user = await User.findOne({ memberId: session.memberId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate new plain-text keys
    const newLoginKey = generateKey("LGN");
    const newAccessKey = generateKey("ACC");

    // Hash and store
    user.loginKeyHash = await hashSecret(newLoginKey);
    user.accessKeyHash = await hashSecret(newAccessKey);
    await user.save();

    // Email the new keys
    await sendMail(
      user.email,
      "Your New Login Key & Access Key — Nivesh Ventures",
      welcomeEmailTemplate({
        fullName: user.fullName,
        memberId: user.memberId,
        loginKey: newLoginKey,
        accessKey: newAccessKey,
      })
    );

    return NextResponse.json({
      success: true,
      message: "New keys have been generated and sent to your registered email address.",
    });
  } catch (err: any) {
    console.error("resend-keys error:", err);
    return NextResponse.json({ error: err.message || "Failed to resend keys" }, { status: 500 });
  }
}
