import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BusinessRule from "@/models/BusinessRule";
import { requireAdmin } from "@/lib/require-admin";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { appCache, TTL } from "@/lib/cache";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// Default rules to seed if none exist
const DEFAULT_RULES = [
  { key: "referral_level1_pct", category: "referral", label: "Referral Level 1 Commission %", value: 5, type: "percentage", min: 0, max: 20, unit: "%" },
  { key: "referral_level2_pct", category: "referral", label: "Referral Level 2 Commission %", value: 3, type: "percentage", min: 0, max: 10, unit: "%" },
  { key: "referral_level3_pct", category: "referral", label: "Referral Level 3 Commission %", value: 2, type: "percentage", min: 0, max: 10, unit: "%" },
  { key: "referral_level4_pct", category: "referral", label: "Referral Level 4 Commission %", value: 1, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "referral_level5_pct", category: "referral", label: "Referral Level 5 Commission %", value: 1, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "matching_income_pct", category: "matching", label: "Binary Matching Income %", value: 10, type: "percentage", min: 0, max: 30, unit: "%" },
  { key: "monthly_returns_min_pct", category: "returns", label: "Monthly Returns Min %", value: 5, type: "percentage", min: 1, max: 15, unit: "%" },
  { key: "monthly_returns_max_pct", category: "returns", label: "Monthly Returns Max %", value: 7, type: "percentage", min: 1, max: 15, unit: "%" },
  { key: "returns_level1_pct", category: "returns", label: "Returns Level 1 %", value: 5, type: "percentage", min: 0, max: 10, unit: "%" },
  { key: "returns_level2_pct", category: "returns", label: "Returns Level 2 %", value: 3, type: "percentage", min: 0, max: 10, unit: "%" },
  { key: "returns_level3_pct", category: "returns", label: "Returns Level 3 %", value: 2, type: "percentage", min: 0, max: 10, unit: "%" },
  { key: "returns_level4_pct", category: "returns", label: "Returns Level 4 %", value: 1, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "returns_level5_pct", category: "returns", label: "Returns Level 5 %", value: 1, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "returns_level6_pct", category: "returns", label: "Returns Level 6 %", value: 0.5, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "returns_level7_pct", category: "returns", label: "Returns Level 7 %", value: 0.5, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "returns_level8_pct", category: "returns", label: "Returns Level 8 %", value: 0.5, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "returns_level9_pct", category: "returns", label: "Returns Level 9 %", value: 0.5, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "returns_level10_pct", category: "returns", label: "Returns Level 10 %", value: 0.5, type: "percentage", min: 0, max: 5, unit: "%" },
  { key: "reward_rank_star", category: "rewards", label: "Star Rank Reward ($)", value: 100, type: "number", min: 0, unit: "$" },
  { key: "reward_rank_gold", category: "rewards", label: "Gold Rank Reward ($)", value: 250, type: "number", min: 0, unit: "$" },
  { key: "reward_rank_diamond", category: "rewards", label: "Diamond Rank Reward ($)", value: 500, type: "number", min: 0, unit: "$" },
  { key: "min_investment_amount", category: "general", label: "Minimum Investment Amount ($)", value: 30, type: "number", min: 10, unit: "$" },
  { key: "withdrawal_min_amount", category: "general", label: "Minimum Withdrawal Amount ($)", value: 10, type: "number", min: 1, unit: "$" },
  { key: "withdrawal_fee_pct", category: "general", label: "Withdrawal Fee %", value: 5, type: "percentage", min: 0, max: 20, unit: "%" },
];

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const getDeleted = searchParams.get("deleted") === "true";

  await connectDB();

  if (getDeleted) {
    const DeletedRuleLog = (await import("@/models/DeletedRuleLog")).default;
    const logs = await DeletedRuleLog.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ logs });
  }

  const cacheKey = "business_rules_all";
  const cached = appCache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  let rules = await BusinessRule.find({}).sort({ category: 1, key: 1 }).lean();

  // Seed defaults if empty
  if (rules.length === 0) {
    await BusinessRule.insertMany(DEFAULT_RULES.map((r) => ({ ...r, updatedBy: "system", history: [] })));
    rules = await BusinessRule.find({}).sort({ category: 1, key: 1 }).lean();
  }

  // Group by category
  const grouped = rules.reduce((acc: any, rule: any) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {});

  const response = { rules, grouped };
  appCache.set(cacheKey, response, TTL.MEDIUM);
  return NextResponse.json(response);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { key, value, label, category, type, min, max, unit, description, isEditable, note } = body;

  if (!key)
    return NextResponse.json({ error: "key is required" }, { status: 400 });

  await connectDB();

  const rule = await BusinessRule.findOne({ key });
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  // Validate range if value is updated and min/max are defined
  const targetMin = min !== undefined ? (min === "" || min === null ? null : Number(min)) : rule.min;
  const targetMax = max !== undefined ? (max === "" || max === null ? null : Number(max)) : rule.max;
  const targetValue = value !== undefined ? (type === "boolean" ? value : type === "string" ? value : Number(value)) : rule.value;

  if (targetMin !== null && typeof targetValue === "number" && targetValue < targetMin)
    return NextResponse.json({ error: `Value must be at least ${targetMin}` }, { status: 400 });
  if (targetMax !== null && typeof targetValue === "number" && targetValue > targetMax)
    return NextResponse.json({ error: `Value must be at most ${targetMax}` }, { status: 400 });

  const adminUser = await User.findOne({ memberId: session.memberId }).select("fullName").lean();
  const adminName = (adminUser as any)?.fullName || session.memberId;

  // Keep history (last 10)
  const historyEntry = { previousValue: rule.value, changedBy: adminName, changedAt: new Date(), note: note || "" };
  rule.history = [historyEntry, ...(rule.history || [])].slice(0, 10);
  
  if (value !== undefined) rule.value = targetValue;
  if (label !== undefined) rule.label = label;
  if (category !== undefined) rule.category = category;
  if (type !== undefined) rule.type = type;
  if (min !== undefined) rule.min = min === "" || min === null ? null : Number(min);
  if (max !== undefined) rule.max = max === "" || max === null ? null : Number(max);
  if (unit !== undefined) rule.unit = unit;
  if (description !== undefined) rule.description = description;
  if (isEditable !== undefined) rule.isEditable = isEditable;

  rule.updatedBy = adminName;
  await rule.save();

  // Bust cache
  appCache.flush("business_rules");

  createAuditLog(req, {
    actorId: session.memberId,
    actorRole: "admin",
    actorName: adminName,
    actionType: "rule_update",
    resourceType: "BusinessRule",
    resourceId: key,
    metadata: { previousValue: historyEntry.previousValue, newValue: rule.value, note },
    severity: "warning",
  });

  return NextResponse.json({ success: true, rule });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) return NextResponse.json({ error: "Rule key is required" }, { status: 400 });

  await connectDB();

  const rule = await BusinessRule.findOne({ key });
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const adminUser = await User.findOne({ memberId: session.memberId }).select("fullName").lean();
  const adminName = (adminUser as any)?.fullName || session.memberId;

  // Save to DeletedRuleLog
  const DeletedRuleLog = (await import("@/models/DeletedRuleLog")).default;
  await DeletedRuleLog.create({
    key: rule.key,
    label: rule.label,
    deletedByAdminId: session.memberId,
    deletedByAdminName: adminName,
    previousData: rule.toObject ? rule.toObject() : rule,
  });

  // Delete the rule
  await BusinessRule.deleteOne({ key });

  // Bust cache
  appCache.flush("business_rules");

  createAuditLog(req, {
    actorId: session.memberId,
    actorRole: "admin",
    actorName: adminName,
    actionType: "rule_delete",
    resourceType: "BusinessRule",
    resourceId: key,
    metadata: { rule: rule.toObject ? rule.toObject() : rule },
    severity: "warning",
  });

  return NextResponse.json({ success: true });
}
