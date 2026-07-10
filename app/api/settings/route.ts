import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCachedSettings } from "@/lib/settingsCache";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const settings = await getCachedSettings();
  return NextResponse.json({
    websiteEnabled: settings?.websiteEnabled !== false,
    maintenanceMessage: settings?.maintenanceMessage || "System upgrade in progress. Please try again later.",
    maintenanceModeActive: settings?.maintenanceMode === false,
    secretMaintenanceMessage: settings?.secretMaintenanceMessage || "System upgrade in progress. Please try again later.",
    dashboardWelcomeBannerUrl: settings?.dashboardWelcomeBannerUrl || "",
  });
}
