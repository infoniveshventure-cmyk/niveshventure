import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import WebsiteSettings from "@/models/WebsiteSettings";

const JWT_SECRET = process.env.JWT_SECRET as string;
const COOKIE = "maint_session";

export async function GET() {
  await connectDB();
  let s = await WebsiteSettings.findOne({ key: "singleton" });
  if (!s) s = await WebsiteSettings.create({ key: "singleton" });
  return NextResponse.json({ live: s.maintenanceMode, message: s.secretMaintenanceMessage });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Session expired" }, { status: 403 });
  }

  const { live, message } = await req.json();
  await connectDB();
  
  const updateData: any = { maintenanceMode: !!live };
  if (message !== undefined) {
    updateData.secretMaintenanceMessage = message;
  }
  
  const s = await WebsiteSettings.findOneAndUpdate(
    { key: "singleton" },
    updateData,
    { new: true, upsert: true }
  );
  return NextResponse.json({ success: true, live: s.maintenanceMode, message: s.secretMaintenanceMessage });
}
