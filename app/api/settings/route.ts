import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebsiteSettings from "@/models/WebsiteSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const settings = await WebsiteSettings.findOne({ key: "singleton" }).select("websiteEnabled maintenanceMessage maintenanceMode secretMaintenanceMessage").lean();
  return NextResponse.json({
    websiteEnabled: settings?.websiteEnabled !== false,
    maintenanceMessage: settings?.maintenanceMessage || "System upgrade in progress. Please try again later.",
    maintenanceModeActive: settings?.maintenanceMode === false,
    secretMaintenanceMessage: settings?.secretMaintenanceMessage || "System upgrade in progress. Please try again later.",
  });
}
