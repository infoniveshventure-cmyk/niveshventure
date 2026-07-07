import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { txId: string } }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { txId } = params;
  if (!txId) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

  await connectDB();

  const tx = await Transaction.findById(txId).lean() as any;
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  // Security: users can only view their own transactions
  if (tx.memberId !== session.memberId && session.role !== "admin") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Enrich with user info if needed
  const owner = await User.findOne({ memberId: tx.memberId }).select("fullName memberId").lean() as any;
  
  let senderInfo = null;
  let receiverInfo = null;

  if (tx.senderMemberId) {
    senderInfo = await User.findOne({ memberId: tx.senderMemberId }).select("fullName memberId").lean();
  }
  if (tx.receiverMemberId) {
    receiverInfo = await User.findOne({ memberId: tx.receiverMemberId }).select("fullName memberId").lean();
  }

  return NextResponse.json({
    transaction: {
      ...tx,
      ownerName: owner?.fullName,
      senderName: tx.senderName || (senderInfo as any)?.fullName,
      receiverName: tx.receiverName || (receiverInfo as any)?.fullName,
    },
  });
}
