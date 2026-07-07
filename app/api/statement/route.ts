import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: any) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  await connectDB();

  const query: any = { memberId: session.memberId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  // Fetch Nivesh transactions (type: "investment")
  const niveshQuery = { ...query, type: "investment" };
  const niveshEntries = await Transaction.find(niveshQuery).sort({ createdAt: -1 }).lean();

  // Fetch Renewal transactions (type: "premium_renewal")
  const renewalQuery = { ...query, type: "premium_renewal" };
  const renewalEntries = await Transaction.find(renewalQuery).sort({ createdAt: -1 }).lean();

  // Fetch Access Unlock transactions (type: "unlock_access")
  const unlockQuery = { ...query, type: "unlock_access" };
  const unlockEntries = await Transaction.find(unlockQuery).sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    nivesh: niveshEntries,
    renewal: renewalEntries,
    unlock: unlockEntries,
  });
}
