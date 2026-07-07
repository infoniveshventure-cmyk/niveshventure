import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { getSessionFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const TYPE_GROUPS: Record<string, string[]> = {
  deposit: ["deposit"],
  withdrawal: ["withdrawal"],
  p2p: ["p2p_transfer_in", "p2p_transfer_out"],
  income: ["referral_income", "matching_income", "returns_income", "level_income", "reward_income", "booster_income", "share_reward"],
  activation: ["unlock_access"],
  investment: ["investment"],
  wallet_transfer: ["wallet_transfer"],
  all: [], // no filter
};

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const typeFilter = req.nextUrl.searchParams.get("type") || "all";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  await connectDB();

  const query: any = { memberId: session.memberId };
  const types = TYPE_GROUPS[typeFilter];
  if (types && types.length > 0) {
    query.type = { $in: types };
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  // Enrich P2P transactions with sender/receiver info if missing
  const enriched = await Promise.all(
    transactions.map(async (tx: any) => {
      if ((tx.type === "p2p_transfer_in" || tx.type === "p2p_transfer_out") && (!tx.senderName || !tx.receiverName)) {
        // Try to parse from note field
        const memberId = tx.type === "p2p_transfer_out"
          ? tx.note?.match(/To (\w+)/)?.[1]
          : tx.note?.match(/From (\w+)/)?.[1];
        if (memberId) {
          const other = await User.findOne({ memberId }).select("fullName memberId").lean() as any;
          if (other) {
            if (tx.type === "p2p_transfer_out") {
              tx.receiverMemberId = other.memberId;
              tx.receiverName = other.fullName;
              tx.senderMemberId = session.memberId;
            } else {
              tx.senderMemberId = other.memberId;
              tx.senderName = other.fullName;
              tx.receiverMemberId = session.memberId;
            }
          }
        }
      }
      return tx;
    })
  );

  // Get current user name for display
  const currentUser = await User.findOne({ memberId: session.memberId }).select("fullName").lean() as any;

  return NextResponse.json({
    transactions: enriched,
    total,
    page,
    pages: Math.ceil(total / limit),
    currentUserName: currentUser?.fullName || "",
  });
}
