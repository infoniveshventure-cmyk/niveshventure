import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier")?.trim();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    await connectDB();

    // Check if the identifier is an email (contains '@')
    if (identifier.includes("@")) {
      const user = await User.findOne({ email: identifier.toLowerCase() }).select("email").lean();
      if (!user) {
        return NextResponse.json({ error: "User not found with this email" }, { status: 404 });
      }
      return NextResponse.json({ email: user.email });
    } else {
      // Treat as Member ID
      const user = await User.findOne({ memberId: identifier.toUpperCase() }).select("email").lean();
      if (!user) {
        return NextResponse.json({ error: "User not found with this ID" }, { status: 404 });
      }
      return NextResponse.json({ email: user.email });
    }
  } catch (err: any) {
    console.error("Resolve identifier error:", err);
    return NextResponse.json({ error: err.message || "Failed to resolve identifier" }, { status: 500 });
  }
}
