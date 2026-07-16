"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import {
  Wallet,
  PiggyBank,
  Coins,
  TrendingUp,
  Users,
  BarChart3,
  Layers,
  Trophy,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { currencySymbol } from "@/lib/currency";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tx = {
  _id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  currency: string;
  createdAt: string;
  note?: string;
  status?: string;
  isAdmin?: boolean;
  walletType?: string;
  adminRemarks?: string;
};

type WalletData = {
  wallet: {
    walletBalance: number;
    dailyReturnsWallet?: number;
    withdrawalReturnsWallet?: number;
    boosterWalletBalance: number;
    nivshWalletBalance: number;
    usdtWalletBalance: number;
    usdtWalletAddress: string;
    totalReferralIncome: number;
    totalMatchingIncome: number;
    totalReturnsIncome: number;
    totalLevelIncome: number;
    totalRewardIncome: number;
    totalInvestment: number;
    totalWithdrawn: number;
  };
  transactions: Tx[];
  totalEarnings: number;
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<string>("all");
  const [userRank, setUserRank] = useState<string>("Unranked");
  const [dailyReturnPending, setDailyReturnPending] = useState(0);
  const [totalDailyReturnSettled, setTotalDailyReturnSettled] = useState(0);

  const sym = currencySymbol(profile?.country);

  useEffect(() => {
    Promise.all([
      fetch("/api/wallet", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/user/me", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([walletData, meData]) => {
        setData(walletData);
        setUserRank(meData?.user?.rank || meData?.stats?.rank || "Unranked");
        setDailyReturnPending(meData?.stats?.dailyReturnPending || 0);
        setTotalDailyReturnSettled(meData?.stats?.totalDailyReturnSettled || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const w = data?.wallet;

  const totalEarnings =
    (w?.totalReferralIncome ?? 0) +
    (w?.totalMatchingIncome ?? 0) +
    (w?.totalReturnsIncome ?? 0) +
    (w?.totalLevelIncome ?? 0) +
    (w?.totalRewardIncome ?? 0);

  const txTypes = [
    "all",
    "referral_income",
    "matching_income",
    "returns_income",
    "level_income",
    "reward_income",
    "withdrawal",
    "deposit",
    "admin_credit",
    "admin_debit",
  ];

  const filteredTx = (data?.transactions ?? []).filter(
    (t) => txFilter === "all" || t.type === txFilter
  );

  return (
    <DashboardShell>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Wallet</h1>
        <Link href="/withdrawal" className="btn-primary text-sm">
          Withdraw
        </Link>
      </div>
      {/* ── Section 1: Primary Wallets ── */}
      <p className="text-xs text-ink-muted uppercase tracking-widest font-semibold mb-3">
        Main Balance Wallet
      </p>
      <div className="max-w-md mb-6">
        {/* 1. My Wallet */}
        <Link href="/withdrawal" className="stat-card group block">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <Wallet size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">My Wallet</p>
          <p className="font-display text-xl font-bold mt-1 group-hover:text-neon-cyan transition">
            {sym}{(w?.walletBalance ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
            Main balance for withdrawals, P2P transfers &amp; investments
          </p>
        </Link>
      </div>
      {/* ── Section 2: Investment Summary ── */}
      <p className="text-xs text-ink-muted uppercase tracking-widest font-semibold mb-3">
        Investment Summary
      </p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* 3. Total Nivesh */}
        <Link href="/invest" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <PiggyBank size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Total Nivesh</p>
          <p className="font-display text-xl font-bold mt-1 text-neon-cyan group-hover:text-neon-cyan transition">
            {sym}{(w?.totalInvestment ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-ink-muted mt-1.5">Lifetime investment total</p>
        </Link>

        {/* 10. Total Withdrawal */}
        <Link href="/withdrawal" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <ArrowUpRight size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Total Withdrawal</p>
          <p className="font-display text-xl font-bold mt-1 group-hover:text-neon-cyan transition">
            {sym}{(w?.totalWithdrawn ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-ink-muted mt-1.5">Total successfully withdrawn</p>
        </Link>
      </div>

      {/* ── Section 3: Income Breakdown ── */}
      <p className="text-xs text-ink-muted uppercase tracking-widest font-semibold mb-3">
        Income Breakdown
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {/* 4. Referral Income */}
        <Link href="/income" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <Users size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Referral Income</p>
          <p className="font-display text-lg font-bold mt-1 text-neon-cyan">
            {sym}{(w?.totalReferralIncome ?? 0).toLocaleString()}
          </p>
        </Link>

        {/* 5. Matching Income */}
        <Link href="/income" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <BarChart3 size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Matching Income</p>
          <p className="font-display text-lg font-bold mt-1 text-neon-cyan">
            {sym}{(w?.totalMatchingIncome ?? 0).toLocaleString()}
          </p>
        </Link>

        {/* 6. Returns */}
        <Link href="/income" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Returns</p>
          <p className="font-display text-lg font-bold mt-1 text-neon-cyan">
            {sym}{(w?.totalReturnsIncome ?? 0).toLocaleString()}
          </p>
        </Link>

        {/* 7. Level Returns */}
        <Link href="/income" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <Layers size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Level Returns</p>
          <p className="font-display text-lg font-bold mt-1 text-neon-cyan">
            {sym}{(w?.totalLevelIncome ?? 0).toLocaleString()}
          </p>
        </Link>

        {/* 8. Reward Income */}
        <Link href="/rewards" className="stat-card group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
            <Trophy size={18} className="text-base" />
          </div>
          <p className="text-xs text-ink-muted">Reward Income</p>
          <p className="font-display text-lg font-bold mt-1 text-neon-cyan">
            {sym}{(w?.totalRewardIncome ?? 0).toLocaleString()}
          </p>
        </Link>
      </div>

      {/* 9. Total Earnings — full-width summary */}
      <div className="glass-card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center shrink-0">
              <Star size={18} className="text-base" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Total Earnings</p>
              <p className="font-display text-2xl font-bold mt-0.5 text-neon-cyan">
                {sym}{totalEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Lifetime earnings across all income types
              </p>
            </div>
          </div>

          {/* mini breakdown pills */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
            {[
              { label: "Referral", value: w?.totalReferralIncome ?? 0 },
              { label: "Matching", value: w?.totalMatchingIncome ?? 0 },
              { label: "Returns", value: w?.totalReturnsIncome ?? 0 },
              { label: "Level", value: w?.totalLevelIncome ?? 0 },
              { label: "Reward", value: w?.totalRewardIncome ?? 0 },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl px-2 py-2">
                <p className="text-[10px] text-ink-muted uppercase tracking-wide">{item.label}</p>
                <p className="font-semibold text-sm mt-0.5 text-neon-cyan">
                  {sym}{item.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3.5: Rank & Daily Return Status ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Current Rank */}
        <Link href="/rewards" className="stat-card group border border-amber-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #f5c842 0%, #e0a020 100%)" }}>
              <Trophy size={22} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-muted font-semibold uppercase tracking-wide">Current Rank</p>
              <p className="font-display text-xl font-bold mt-0.5 text-amber-400 group-hover:text-amber-300 transition">
                {loading ? "—" : (profile?.rank || userRank || "Unranked")}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">View rank rewards →</p>
            </div>
          </div>
        </Link>

        {/* Daily Return Pending */}
        <div className="stat-card border border-yellow-400/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-400/15 flex items-center justify-center shrink-0">
              <Clock size={22} className="text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-muted font-semibold uppercase tracking-wide">Daily Return (Pending)</p>
              <p className="font-display text-xl font-bold mt-0.5 text-yellow-400">
                {loading ? "—" : `$${dailyReturnPending.toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
              </p>
              <p className="text-[10px] text-yellow-400/60 mt-0.5 leading-snug">
                Available for withdrawal after monthly settlement
              </p>
              {totalDailyReturnSettled > 0 && (
                <p className="text-[10px] text-neon-green/70 mt-1">
                  Total settled: ${totalDailyReturnSettled.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Transaction History ── */}
      <div id="tx-history" className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold">Transaction History</h2>

          {/* filter chips */}
          <div className="flex gap-2 flex-wrap">
            {txTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTxFilter(t)}
                className={`text-[11px] px-2.5 py-1 rounded-full capitalize transition-all border ${
                  txFilter === t
                    ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan"
                    : "border-white/10 text-ink-muted hover:border-white/25"
                }`}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : !filteredTx.length ? (
          <p className="text-sm text-ink-muted py-12 text-center">
            No transactions found for this filter.
          </p>
        ) : (
          <div className="space-y-1">
            {filteredTx.map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      t.direction === "credit"
                        ? "bg-neon-green/15 text-neon-green"
                        : "bg-neon-magenta/15 text-neon-magenta"
                    }`}
                  >
                    {t.direction === "credit" ? (
                      <ArrowDownRight size={16} />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize flex items-center gap-1.5">
                      {t.isAdmin && <ShieldCheck size={12} className="text-amber-400 shrink-0" />}
                      {t.isAdmin
                        ? (t.adminRemarks || `Admin ${t.direction}`)
                        : t.type.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-ink-muted">
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {t.isAdmin && t.walletType && (
                        <span className="text-[10px] px-1.5 py-px rounded-full bg-amber-500/15 text-amber-400">
                          {t.walletType === "main" ? "Main" : t.walletType === "booster" ? "Booster" : t.walletType === "nivesh" ? "Nivesh" : "USDT"}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-px rounded-full ${
                          t.status === "completed"
                            ? "bg-neon-green/15 text-neon-green"
                            : t.status === "pending"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-neon-magenta/15 text-neon-magenta"
                        }`}
                      >
                        {t.status ?? "completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <p
                  className={`text-sm font-semibold ${
                    t.direction === "credit" ? "text-neon-green" : "text-ink"
                  }`}
                >
                  {t.direction === "credit" ? "+" : "-"}
                  {t.currency} {t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
