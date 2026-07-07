import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Investment from "@/models/Investment";
import Transaction from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";
import { requireAdmin } from "@/lib/require-admin";
import { getSessionFromCookies } from "@/lib/auth-server";
import { notifyMember } from "@/lib/notification";

export const dynamic = "force-dynamic";

const DEFAULT_RETURNS_LEVELS = [15, 10, 5, 5, 5, 3, 2, 1, 1, 1]; // Level ROI commissions (%)

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const percentage = Number(searchParams.get("percentage")) || 6.0;

  await connectDB();

  // Load all active members
  const members = await User.find({ role: "member", isActive: true }).lean();

  // Pre-load all investments grouped by memberId
  const investments = await Investment.find({ status: "active" }).lean();
  const investMap = new Map<string, number>();
  for (const inv of investments) {
    investMap.set(inv.memberId, (investMap.get(inv.memberId) || 0) + inv.amount);
  }

  // Pre-load parent-child relationships to build upline paths
  const memberMap = new Map<string, any>(members.map((m) => [m.memberId, m]));

  const previewList = members.map((member: any) => {
    const totalInvested = investMap.get(member.memberId) || 0;
    const roiAmount = totalInvested * (percentage / 100);
    return {
      memberId: member.memberId,
      fullName: member.fullName,
      totalInvestment: totalInvested,
      roiAmount: Number(roiAmount.toFixed(2)),
      levelIncomeAmount: 0, // Calculated in pass 2
    };
  });

  // Calculate Level Returns
  const previewMap = new Map(previewList.map((p) => [p.memberId, p]));
  for (const member of members) {
    const totalInvested = investMap.get(member.memberId) || 0;
    if (totalInvested <= 0) continue;
    const roiAmount = totalInvested * (percentage / 100);

    // Distribute level commissions up to 10 levels up the parentId chain
    let currentParentId = member.parentId;
    let depth = 1;
    while (currentParentId && depth <= 10) {
      const parent = memberMap.get(currentParentId);
      if (!parent) break;

      const parentPreview = previewMap.get(parent.memberId);
      if (parentPreview && parent.activatedByFreePin !== true) {
        const rate = DEFAULT_RETURNS_LEVELS[depth - 1] || 0;
        parentPreview.levelIncomeAmount += roiAmount * (rate / 100);
      }

      currentParentId = parent.parentId;
      depth++;
    }
  }

  // Format decimals
  previewList.forEach((p) => {
    p.levelIncomeAmount = Number(p.levelIncomeAmount.toFixed(2));
  });

  return NextResponse.json({
    preview: previewList.filter((p) => p.roiAmount > 0 || p.levelIncomeAmount > 0),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const adminUser = await User.findOne({ memberId: session.memberId }).select("fullName").lean();
  const adminName = (adminUser as any)?.fullName || session.memberId;

  try {
    const { percentage, memberIds, period } = await req.json();
    if (!percentage || !period) {
      return NextResponse.json({ error: "Percentage and Period (YYYY-MM) are required" }, { status: 400 });
    }

    const members = await User.find({ role: "member", isActive: true });
    const targetMemberIds = memberIds && memberIds.length > 0 ? memberIds : members.map((m) => m.memberId);

    // Pre-load investments
    const investments = await Investment.find({ status: "active" }).lean();
    const investMap = new Map<string, number>();
    for (const inv of investments) {
      investMap.set(inv.memberId, (investMap.get(inv.memberId) || 0) + inv.amount);
    }

    // Pre-load member map
    const memberMap = new Map<string, any>(members.map((m) => [m.memberId, m]));

    let creditedCount = 0;
    let duplicateSkipped = 0;
    let totalCreditedRoi = 0;
    let totalCreditedLevel = 0;

    // Track level returns to credit at the end
    const levelIncomeCredits: Record<string, number> = {};

    // Pass 1: Credit ROI (Monthly Returns)
    for (const memberId of targetMemberIds) {
      const member = memberMap.get(memberId);
      if (!member) continue;

      const totalInvested = investMap.get(memberId) || 0;
      if (totalInvested <= 0) continue;

      const roiAmount = totalInvested * (percentage / 100);
      if (roiAmount <= 0) continue;

      // Duplicate Credit Protection: Check if already credited for this period
      const existing = await Transaction.findOne({
        memberId,
        type: "returns_income",
        note: `Monthly ROI - ${period}`,
      });
      if (existing) {
        duplicateSkipped++;
        continue;
      }

      // Credit user
      member.walletBalance = (member.walletBalance || 0) + roiAmount;
      member.totalReturnsIncome = (member.totalReturnsIncome || 0) + roiAmount;
      await member.save();

      await Transaction.create({
        memberId,
        type: "returns_income",
        direction: "credit",
        amount: roiAmount,
        currency: "USDT",
        status: "completed",
        note: `Monthly ROI - ${period}`,
        description: `Credited ${percentage}% Returns Income on Investment volume of $${totalInvested}`,
      });

      totalCreditedRoi += roiAmount;
      creditedCount++;

      notifyMember(
        memberId,
        "Monthly Return Credited 💸",
        `Your Monthly Return of $${roiAmount.toFixed(2)} (${percentage}%) has been credited to your wallet for ${period}.`,
        "returns_income"
      ).catch(() => {});

      // Accumulate level returns for uplines
      let currentParentId = member.parentId;
      let depth = 1;
      while (currentParentId && depth <= 10) {
        const parent = memberMap.get(currentParentId);
        if (!parent) break;

        if (parent.activatedByFreePin !== true) {
          const rate = DEFAULT_RETURNS_LEVELS[depth - 1] || 0;
          const levelReward = roiAmount * (rate / 100);
          levelIncomeCredits[parent.memberId] = (levelIncomeCredits[parent.memberId] || 0) + levelReward;
        }

        currentParentId = parent.parentId;
        depth++;
      }
    }

    // Pass 2: Credit Level Income (Returns Level Income)
    for (const [lvlMemberId, levelAmount] of Object.entries(levelIncomeCredits)) {
      if (levelAmount <= 0) continue;

      // Duplicate Credit Protection: Check if already credited for this period
      const existing = await Transaction.findOne({
        memberId: lvlMemberId,
        type: "level_income",
        note: `Monthly Level ROI - ${period}`,
      });
      if (existing) continue;

      const lvlMember = memberMap.get(lvlMemberId);
      if (lvlMember) {
        lvlMember.walletBalance = (lvlMember.walletBalance || 0) + levelAmount;
        lvlMember.totalLevelIncome = (lvlMember.totalLevelIncome || 0) + levelAmount;
        await lvlMember.save();

        await Transaction.create({
          memberId: lvlMemberId,
          type: "level_income",
          direction: "credit",
          amount: levelAmount,
          currency: "USDT",
          status: "completed",
          note: `Monthly Level ROI - ${period}`,
          description: `Returns Level Income commission for period ${period}`,
        });

        totalCreditedLevel += levelAmount;

        notifyMember(
          lvlMemberId,
          "Level Returns Credited 💸",
          `You received upline level returns commission of $${levelAmount.toFixed(2)} for ${period}.`,
          "level_income"
        ).catch(() => {});
      }
    }

    // Create Audit Log entry matching AuditLog schema
    await AuditLog.create({
      actorId: session.memberId,
      actorRole: "admin",
      actorName: adminName,
      actionType: "income_distribution",
      resourceType: "Transaction",
      severity: "info",
      metadata: {
        percentage,
        period,
        creditedCount,
        duplicateSkipped,
        totalCreditedRoi,
        totalCreditedLevel,
        adminRemarks: `Distributed ${percentage}% Monthly ROI and Level Returns for ${period}.`
      }
    });

    return NextResponse.json({
      success: true,
      creditedCount,
      duplicateSkipped,
      totalCreditedRoi,
      totalCreditedLevel,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to distribute returns" }, { status: 500 });
  }
}
