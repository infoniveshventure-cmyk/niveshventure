import WebsiteSettings from "@/models/WebsiteSettings";
import { appCache, TTL } from "./cache";

export async function getCachedSettings() {
  const cacheKey = "website_settings_singleton";
  const cached = appCache.get(cacheKey);
  if (cached) return cached;

  const settings = await WebsiteSettings.findOne({ key: "singleton" }).lean();
  if (settings) {
    appCache.set(cacheKey, settings, TTL.MEDIUM);
  }
  return settings;
}

export function clearCachedSettings() {
  appCache.del("website_settings_singleton");
}
