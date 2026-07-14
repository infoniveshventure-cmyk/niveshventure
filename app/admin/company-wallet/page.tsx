"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import { Wallet, TrendingUp, DollarSign, History, ArrowUpRight, ArrowDownLeft, Calendar, User } from "lucide-react";
import toast from "react-hot-toast";

export default function CompanyWalletPage() {
  const [walletType, setWalletType] = useState<"main" | "revenue">("main");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/company-wallet?walletType=${walletType}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load company wallet details");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }, [walletType]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const displayTxnType = (type: string) => {
    return type
      .replace("payout_", "Payout: ")
      .replace(/_/g, " ")
      .toUpperCase();
  };

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Company Ledger & Wallets</h1>
          <p className="text-sm text-ink-muted mt-1">
            Real-time balances and verified transactions audit trail
          </p>
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Main Wallet */}
        <div
          onClick={() => setWalletType("main")}
          className={`cursor-pointer p-6 rounded-2xl border transition-all ${
            walletType === "main"
              ? "bg-gradient-to-br from-neon-cyan/20 to-transparent border-neon-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)]"
              : "bg-white/5 border-white/5 hover:border-white/15"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold tracking-wider text-ink-muted uppercase">
              Company Main Balance
            </span>
            <Wallet className={walletType === "main" ? "text-neon-cyan" : "text-ink-muted"} size={22} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">
              ${data?.companyMainBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
            </span>
            <span className="text-xs text-neon-cyan font-bold uppercase tracking-wider">USDT</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-3">
            Available liquidity (Approved Deposits minus Withdrawals & Distributed Payouts)
          </p>
        </div>

        {/* Revenue Wallet */}
        <div
          onClick={() => setWalletType("revenue")}
          className={`cursor-pointer p-6 rounded-2xl border transition-all ${
            walletType === "revenue"
              ? "bg-gradient-to-br from-neon-magenta/20 to-transparent border-neon-magenta shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              : "bg-white/5 border-white/5 hover:border-white/15"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold tracking-wider text-ink-muted uppercase">
              Company Revenue Balance
            </span>
            <TrendingUp className={walletType === "revenue" ? "text-neon-magenta" : "text-ink-muted"} size={22} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">
              ${data?.companyRevenueBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
            </span>
            <span className="text-xs text-neon-magenta font-bold uppercase tracking-wider">USDT</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-3">
            Company profit earnings (Unlock Access Fees & 3% Withdrawal Processing Fees)
          </p>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <History className="text-neon-violet" size={18} />
          <h2 className="font-display font-semibold text-lg text-white">
            {walletType === "main" ? "Main Balance History" : "Revenue Earnings Logs"}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted text-center py-8">Loading logs...</p>
        ) : !data?.history?.length ? (
          <p className="text-sm text-ink-muted text-center py-8">No transaction logs available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-ink-muted font-bold uppercase tracking-wider">
                  <th className="py-3">Member ID</th>
                  <th className="py-3">Member Name</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {data.history.map((t: any) => (
                  <tr key={t._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 font-medium text-white flex items-center gap-1.5">
                      <User size={13} className="text-ink-muted" />
                      {t.memberId}
                    </td>
                    <td className="py-3.5 text-ink-muted">{t.userName || "N/A"}</td>
                    <td className="py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.type === "credit"
                          ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                          : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                      }`}>
                        {displayTxnType(t.transactionType)}
                      </span>
                    </td>
                    <td className={`py-3.5 font-bold ${
                      t.type === "credit" ? "text-neon-green" : "text-neon-magenta"
                    }`}>
                      {t.type === "credit" ? "+" : "-"}${t.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-xs text-ink-muted max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className="py-3.5 text-xs text-ink-muted">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
