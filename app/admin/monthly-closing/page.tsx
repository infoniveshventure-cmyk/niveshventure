"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  RefreshCw,
  Search,
  XOctagon,
  Wallet
} from "lucide-react";

export default function AdminMonthlyClosingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Search filters
  const [search7, setSearch7] = useState("");
  const [search5, setSearch5] = useState("");

  const fetchClosingData = async () => {
    try {
      const res = await fetch("/api/admin/monthly-closing", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load closing data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosingData();
  }, []);

  const handleStartClosing = async () => {
    if (!confirm("Are you sure you want to start the Monthly Closing stage? This will freeze calculations.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/monthly-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_closing",
          month: data.currentMonth,
          monthlyReturnPercentage: 7, // 7% is the default base plan
          distributionPercentage: 100,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to start closing");
      toast.success("Monthly closing calculations initialized successfully!");
      fetchClosingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteClosing = async () => {
    if (!confirm("Are you sure you want to execute Monthly Closing? All pending daily returns and level returns will be transferred to users' Level Return Wallets, and pending counts will reset to 0.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/monthly-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_closing",
          month: data.currentMonth,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to complete closing");
      toast.success("Monthly closing submitted and settled successfully!");
      fetchClosingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <AdminSubnav />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-neon-cyan h-8 w-8" />
        </div>
      </DashboardShell>
    );
  }

  const status = data?.status || "open";

  // Filter lists based on search inputs
  const filteredUsers7 = (data?.users7 || []).filter(
    (u: any) =>
      u.memberId.toLowerCase().includes(search7.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search7.toLowerCase())
  );

  const filteredUsers5 = (data?.users5 || []).filter(
    (u: any) =>
      u.memberId.toLowerCase().includes(search5.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search5.toLowerCase())
  );

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin Monthly Closing</h1>
          <p className="text-sm text-ink-muted mt-1">
            Perform monthly settlement to transfer pending daily returns &amp; level income to Level Return Wallets.
          </p>
        </div>
        <button
          onClick={fetchClosingData}
          disabled={actionLoading}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition animate-pulse"
        >
          <RefreshCw size={14} className={actionLoading ? "animate-spin" : ""} />
          Refresh Stats
        </button>
      </div>

      {/* ── Section 1: Dashboard ROI Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card border border-neon-cyan/20">
          <span className="text-xs text-ink-muted">Total 7% ROI Users</span>
          <p className="font-display text-2xl font-bold text-neon-cyan mt-1">
            {data?.stats7?.totalUsers || 0}
          </p>
          <span className="text-[10px] text-ink-muted">ROI Plan: 7% (Miss Count 0/1)</span>
        </div>

        <div className="stat-card border border-neon-cyan/20">
          <span className="text-xs text-ink-muted">Total 7% Pending Daily Return</span>
          <p className="font-display text-2xl font-bold text-neon-cyan mt-1">
            ${(data?.stats7?.totalPending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="stat-card border border-neon-magenta/20">
          <span className="text-xs text-ink-muted">Total 5% ROI Users</span>
          <p className="font-display text-2xl font-bold text-neon-magenta mt-1">
            {data?.stats5?.totalUsers || 0}
          </p>
          <span className="text-[10px] text-ink-muted">ROI Plan: 5% (Miss Count 2)</span>
        </div>

        <div className="stat-card border border-neon-magenta/20">
          <span className="text-xs text-ink-muted">Total 5% Pending Daily Return</span>
          <p className="font-display text-2xl font-bold text-neon-magenta mt-1">
            ${(data?.stats5?.totalPending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ── Section 2: Closing controls ── */}
      <div className="glass-card p-6 mb-8 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-white">Monthly Settlement Action</h2>
          <p className="text-xs text-ink-muted mt-1 max-w-xl">
            Click <strong>Start Closing</strong> first to compute and freeze this month's calculations, then click <strong>Monthly Closing Submit</strong> to release payments.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {status === "open" && (
            <button
              onClick={handleStartClosing}
              disabled={actionLoading}
              className="btn-primary flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
            >
              Start Closing &amp; Freeze
            </button>
          )}

          {status === "closing_in_progress" && (
            <button
              onClick={handleCompleteClosing}
              disabled={actionLoading}
              className="btn-primary bg-neon-green border-neon-green text-black flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:scale-105 transition-all"
            >
              Monthly Closing Submit
            </button>
          )}

          {status === "closed" && (
            <div className="px-6 py-2.5 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Completed for {data?.currentMonth}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Tables list of users ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        
        {/* A. 7% ROI Users List */}
        <div className="glass-card p-5 border border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-neon-cyan" /> 7% ROI Users List
              </h3>
              <p className="text-[10px] text-ink-muted mt-0.5">Users with 7% daily predictions (0/1 misses)</p>
            </div>
            
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search ID/Name..."
                value={search7}
                onChange={(e) => setSearch7(e.target.value)}
                className="input-field pl-8 pr-3 py-1 text-xs w-full"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="border-b border-white/10 pb-2 text-white">
                  <th className="py-2">User ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2 text-right">Investment</th>
                  <th className="py-2 text-center">Misses</th>
                  <th className="py-2 text-right">Pending Return</th>
                </tr>
              </thead>
              <tbody>
                {!filteredUsers7.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-muted">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers7.map((u: any) => (
                    <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-mono text-neon-cyan font-semibold">{u.memberId}</td>
                      <td className="py-2.5 text-white max-w-[120px] truncate">{u.fullName}</td>
                      <td className="py-2.5 text-right">${(u.totalInvestment || 0).toLocaleString()}</td>
                      <td className="py-2.5 text-center font-bold text-neon-cyan">{u.monthlyMissCount || 0}</td>
                      <td className="py-2.5 text-right text-neon-green font-mono font-semibold">
                        ${(u.dailyReturnsWallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* B. 5% ROI Users List */}
        <div className="glass-card p-5 border border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <XOctagon size={16} className="text-neon-magenta" /> 5% ROI Users List
              </h3>
              <p className="text-[10px] text-ink-muted mt-0.5">Users downgraded to 5% ROI (2 misses)</p>
            </div>
            
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search ID/Name..."
                value={search5}
                onChange={(e) => setSearch5(e.target.value)}
                className="input-field pl-8 pr-3 py-1 text-xs w-full"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="border-b border-white/10 pb-2 text-white">
                  <th className="py-2">User ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2 text-right">Investment</th>
                  <th className="py-2 text-center">Misses</th>
                  <th className="py-2 text-right">Pending Return</th>
                </tr>
              </thead>
              <tbody>
                {!filteredUsers5.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-muted">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers5.map((u: any) => (
                    <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 font-mono text-neon-magenta font-semibold">{u.memberId}</td>
                      <td className="py-2.5 text-white max-w-[120px] truncate">{u.fullName}</td>
                      <td className="py-2.5 text-right">${(u.totalInvestment || 0).toLocaleString()}</td>
                      <td className="py-2.5 text-center font-bold text-neon-magenta">{u.monthlyMissCount || 0}</td>
                      <td className="py-2.5 text-right text-neon-green font-mono font-semibold">
                        ${(u.dailyReturnsWallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Section 4: History Table ── */}
      <div className="glass-card p-5 border border-white/10">
        <h2 className="font-display font-semibold mb-4 text-white flex items-center gap-2">
          <Calendar size={18} className="text-neon-cyan" />
          Monthly Closing &amp; Payout History
        </h2>
        {!data?.history?.length ? (
          <p className="text-sm text-ink-muted py-8 text-center">No past closing records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="border-b border-white/10 pb-2 text-white">
                  <th className="py-2 font-semibold">Closing Month</th>
                  <th className="py-2 text-center font-semibold">7% Users Closed</th>
                  <th className="py-2 text-center font-semibold">5% Users Closed</th>
                  <th className="py-2 text-right font-semibold">Total Daily Return Closed</th>
                  <th className="py-2 text-right font-semibold">Total Level Return Closed</th>
                  <th className="py-2 text-center font-semibold">Closing Date &amp; Time</th>
                  <th className="py-2 font-semibold">Admin Name</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h: any) => (
                  <tr key={h._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-semibold text-white">{h.month}</td>
                    <td className="py-2.5 text-center font-bold text-neon-cyan">{h.users7ClosedCount ?? 0}</td>
                    <td className="py-2.5 text-center font-bold text-neon-magenta">{h.users5ClosedCount ?? 0}</td>
                    <td className="py-2.5 text-right text-neon-green font-mono font-semibold">
                      ${(h.totalDailyReturnClosed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right text-neon-green font-mono font-semibold">
                      ${(h.totalReturnsLevelClosed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-center">{h.completedAt ? new Date(h.completedAt).toLocaleString() : "—"}</td>
                    <td className="py-2.5 font-medium text-white">{h.closedByAdminName || "Admin"}</td>
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
