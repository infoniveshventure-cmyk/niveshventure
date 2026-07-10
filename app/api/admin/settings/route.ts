import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebsiteSettings from "@/models/WebsiteSettings";
import { requireAdmin } from "@/lib/require-admin";
import { getCachedSettings, clearCachedSettings } from "@/lib/settingsCache";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  await connectDB();
  let settings = await getCachedSettings();
  if (!settings) {
    settings = await WebsiteSettings.create({ key: "singleton" });
    clearCachedSettings();
  }
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json();
  await connectDB();
  const settings = await WebsiteSettings.findOneAndUpdate({ key: "singleton" }, body, {
    new: true,
    upsert: true,
  });
  clearCachedSettings();
  return NextResponse.json({ success: true, settings });
}
