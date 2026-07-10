import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Offer from "@/models/Offer";
import { requireAdmin } from "@/lib/require-admin";
export async function GET() {
  await connectDB();
  const offers = await Offer.find({ active: true }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ offers });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { title, message, price } = await req.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  await connectDB();
  const offer = await Offer.create({ title, message, price: price || 0 });
  return NextResponse.json({ success: true, offer });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await connectDB();
  const offer = await Offer.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json({ success: true, offer });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await connectDB();
  await Offer.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
