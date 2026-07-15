import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectDB();

  const url = req.nextUrl;
  const type = url.searchParams.get("type") || "transaction";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = url.searchParams.get("q") || "";
  const walletType = url.searchParams.get("walletType") || "";
  const status = url.searchParams.get("status") || "";
  const transactionType = url.searchParams.get("transactionType") || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt_desc";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.max(1, Number(url.searchParams.get("limit") || 20));

  // Determine date range filter
  const dateFilter: any = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }
  const hasRange = Object.keys(dateFilter).length > 0;

  // Resolve user search filter
  let userMemberIds: string[] = [];
  let filterByUser = false;

  if (q.trim()) {
    filterByUser = true;
    const users = await User.find({
      $or: [
        { memberId: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
      ],
    }).select("memberId");
    userMemberIds = users.map((u) => u.memberId);
  }

  // Construct query dynamically
  const query: any = {};
  if (hasRange) query.createdAt = dateFilter;
  if (status) query.status = status;
  if (walletType) query.walletType = walletType;
  if (filterByUser) {
    query.memberId = { $in: userMemberIds };
  }

  // Resolve transaction type & type filter
  const incomeTypes = ["referral_income", "matching_income", "returns_income", "level_income", "reward_income"];

  if (type === "income") {
    query.type = { $in: incomeTypes };
  } else if (type === "withdrawal") {
    query.type = "withdrawal";
  } else if (type === "deposit") {
    query.type = "deposit";
  } else if (type === "refund") {
    query.type = "refund";
  } else if (type === "credit") {
    query.direction = "credit";
  } else if (type === "debit") {
    query.direction = "debit";
  } else if (type === "activation") {
    query.type = { $in: ["unlock_access", "premium_activation", "premium_renewal"] };
  } else if (type === "wallet_transaction") {
    // Show only transactions having custom walletType or type-inferred walletType
    if (walletType) query.walletType = walletType;
  }

  if (transactionType) {
    query.type = transactionType;
  }

  // Determine sorting order
  let sortObj: any = { createdAt: -1 };
  if (sortBy === "createdAt_desc") sortObj = { createdAt: -1 };
  if (sortBy === "createdAt_asc") sortObj = { createdAt: 1 };
  if (sortBy === "amount_desc") sortObj = { amount: -1 };
  if (sortBy === "amount_asc") sortObj = { amount: 1 };

  // Fetch results with server-side pagination
  const skip = (page - 1) * limit;
  let rows: any[] = [];
  let totalRows = 0;

  if (type === "member") {
    // Query users collection instead
    const userQuery: any = {};
    if (hasRange) userQuery.createdAt = dateFilter;
    if (status) userQuery.isActive = status === "active";
    if (q.trim()) {
      userQuery.$or = [
        { memberId: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
      ];
    }

    let userSort: any = { createdAt: -1 };
    if (sortBy === "amount_desc") userSort = { totalInvestment: -1 };
    if (sortBy === "amount_asc") userSort = { totalInvestment: 1 };

    totalRows = await User.countDocuments(userQuery);
    rows = await User.find(userQuery)
      .select("-accessKeyHash -loginKeyHash -firebaseUid")
      .sort(userSort)
      .skip(skip)
      .limit(limit)
      .lean();
  } else {
    // Query transactions collection
    totalRows = await Transaction.countDocuments(query);
    rows = await Transaction.find(query).sort(sortObj).skip(skip).limit(limit).lean();
  }

  // Populate username/name information for transactions rows
  if (type !== "member") {
    const memberIds = Array.from(new Set(rows.map((r) => r.memberId)));
    const users = await User.find({ memberId: { $in: memberIds } }).select("memberId fullName");
    const userMap = new Map(users.map((u) => [u.memberId, u.fullName]));
    rows = rows.map((r) => ({
      ...r,
      fullName: userMap.get(r.memberId) || "Unknown",
    }));
  }

  // Generate aggregate analytics summary
  const [creditAgg, debitAgg, incomeAgg, withdrawalAgg, depositAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { direction: "credit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { direction: "debit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { type: { $in: incomeTypes }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { type: "withdrawal", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { type: "deposit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalCredits = creditAgg[0]?.total || 0;
  const totalDebits = debitAgg[0]?.total || 0;
  const totalIncome = incomeAgg[0]?.total || 0;
  const totalWithdrawals = withdrawalAgg[0]?.total || 0;
  const totalDeposits = depositAgg[0]?.total || 0;
  const netProfit = totalDeposits - totalWithdrawals;

  // Wallet distribution aggregation
  const walletAgg = await Transaction.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$walletType", total: { $sum: "$amount" } } },
  ]);
  const walletDistribution = walletAgg.map((w) => ({
    wallet: w._id || "main",
    total: w.total,
  }));

  // Growth Trend (Group by month)
  const growthAgg = await Transaction.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const growthTrends = growthAgg.map((g) => ({
    month: g._id,
    amount: g.total,
  }));

  return NextResponse.json({
    type,
    rows,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit),
    },
    analytics: {
      totalCredits: 0,
      totalDebits: 0,
      totalIncome: 0,
      totalWithdrawals: 0,
      totalDeposits: 0,
      netProfit: 0,
      walletDistribution: [],
      growthTrends: [],
    },
  });
}
