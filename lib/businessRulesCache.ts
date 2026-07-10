import BusinessRule from "@/models/BusinessRule";
import { appCache, TTL } from "./cache";

export interface IBusinessRule {
  key: string;
  category: string;
  label: string;
  description: string;
  value: any;
  type: string;
  min: number | null;
  max: number | null;
  unit: string;
  isEditable: boolean;
  updatedBy: string;
}

export async function getCachedBusinessRules(): Promise<IBusinessRule[]> {
  const cacheKey = "business_rules_all";
  const cached = appCache.get<IBusinessRule[]>(cacheKey);
  if (cached) return cached;

  const rules = await BusinessRule.find({}).lean();
  appCache.set(cacheKey, rules, TTL.MEDIUM);
  return rules as unknown as IBusinessRule[];
}

export async function getCachedBusinessRule(key: string): Promise<IBusinessRule | null> {
  const rules = await getCachedBusinessRules();
  return rules.find((r) => r.key === key) || null;
}
