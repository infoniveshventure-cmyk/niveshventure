import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Pin from "@/models/Pin";
import User from "@/models/User";
import { requireAdmin } from "@/lib/require-admin";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { processActivationIncomes } from "@/lib/binaryMatching";

export const dynamic = "force-dynamic";

// Helper to generate a random unique PIN code
function generatePinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "PIN-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET: List all PINs with filters
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();
  const url = req.nextUrl;

  const status = url.searchParams.get("status") || "";
  const type = url.searchParams.get("type") || "";
  const q = url.searchParams.get("q") || "";

  const query: any = {};
  if (status) query.status = status;
  if (type) query.type = type;
  if (q) {
    query.$or = [
      { code: { $regex: q, $options: "i" } },
      { usedBy: { $regex: q, $options: "i" } },
    ];
  }

  const pins = await Pin.find(query).sort({ createdAt: -1 }).limit(100).lean();
  const totalStock = await Pin.countDocuments({});
  const usedCount = await Pin.countDocuments({ status: "used" });
  const unusedCount = await Pin.countDocuments({ status: "unused" });
  const freeCount = await Pin.countDocuments({ type: "free" });

  return NextResponse.json({
    pins,
    stats: {
      totalStock,
      usedCount,
      unusedCount,
      freeCount,
    },
  });
}

// POST: Generate PINs in bulk
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const { quantity, type } = body;

  const qty = parseInt(quantity || "10");
  if (isNaN(qty) || qty <= 0 || qty > 1000) {
    return NextResponse.json({ error: "Quantity must be between 1 and 1000" }, { status: 400 });
  }

  const pinType = type === "free" ? "free" : "paid";
  const newPins: any[] = [];

  for (let i = 0; i < qty; i++) {
    newPins.push({
      code: generatePinCode(),
      value: 30,
      status: "unused",
      type: pinType,
      generatedBy: session.memberId,
    });
  }

  const created = await Pin.insertMany(newPins);

  createAuditLog(req, {
    actorId: session.memberId,
    actionType: "pin_generate",
    resourceType: "Pin",
    metadata: { quantity: qty, pinType },
  });

  return NextResponse.json({ success: true, count: created.length });
}

// PATCH: Apply PIN to activate user account
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const { code, targetMemberId } = body;

  if (!code || !targetMemberId) {
    return NextResponse.json({ error: "code and targetMemberId are required" }, { status: 400 });
  }

  // Find unused PIN
  const pin = await Pin.findOne({ code, status: "unused" });
  if (!pin) {
    return NextResponse.json({ error: "Invalid or already used PIN" }, { status: 400 });
  }

  // Find user to activate
  const user = await User.findOne({ memberId: targetMemberId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.isActive) {
    return NextResponse.json({ error: "User is already active" }, { status: 400 });
  }

  // Update PIN status
  pin.status = "used";
  pin.usedBy = targetMemberId;
  pin.usedAt = new Date();
  await pin.save();

  // Set flags on user first
  if (pin.type === "free") {
    user.isPremium = false;
    user.activatedByFreePin = true;
  } else {
    user.isPremium = true;
    user.activatedByFreePin = false;
  }
  await user.save();

  // Activate user account and calculate commissions/matching
  await processActivationIncomes(user.memberId);

  createAuditLog(req, {
    actorId: session.memberId,
    actionType: "pin_use",
    resourceType: "Pin",
    resourceId: code,
    targetMemberId,
    metadata: { pinType: pin.type },
  });

  return NextResponse.json({ success: true, message: "User account activated successfully" });
}
