"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import {
  TrendingUp,
  Settings,
  Play,
  Calendar,
  RefreshCw,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AdminDailyReturnPage() {
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<"daily" | "settlement" | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  // Filter state
  const [filterMemberId, setFilterMemberId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Inline edit state
  const [editMode, setEditMode] = useState<"auto" | "manual">("auto");
  const [editMonthlyPct, setEditMonthlyPct] = useState("");
  const [editManualDailyPct, setEditManualDailyPct] = useState("");
  const [configDirty, setConfigDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        memberId: filterMemberId,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        page: String(currentPage),
      });
      const res = await fetch(`/api/admin/daily-return?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig(data.config);
      setStats(data.stats);
      setRecords(data.records || []);
      setPagination(data.pagination);

      // Sync local edit state only on first load or if not dirty
      if (!configDirty) {
        setEditMode(data.config?.mode || "auto");
        setEditMonthlyPct(String(data.config?.monthlyPct ?? 6));
        setEditManualDailyPct(String(data.config?.manualDailyPct ?? 0.2));
      }
    } catch {
      toast.error("Failed to load daily return data");
    } finally {
      setLoading(false);
    }
  }, [filterMemberId, filterDateFrom, filterDateTo, currentPage, configDirty]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchRule(key: string, value: any) {
    const res = await fetch("/api/admin/business-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save");
    }
  }

  async function handleSaveConfig() {
    setSavingMode(true);
    try {
      await patchRule("daily_return_mode", editMode);
      await patchRule("daily_return_monthly_pct", parseFloat(editMonthlyPct));
      if (editMode === "manual") {
        await patchRule("daily_return_manual_pct", parseFloat(editManualDailyPct));
      }
      toast.success("Settings saved successfully");
      setConfigDirty(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingMode(false);
    }
  }

  async function handleTrigger(action: "trigger_daily" | "trigger_settlement") {
    const label = action === "trigger_daily" ? "Daily Return" : "Monthly Settlement";
    if (
      !confirm(
        action === "trigger_settlement"
          ? `⚠️ This will move ALL pending daily returns to member wallets. Confirm?`
          : `Run ${label} now for today?`
      )
    )
      return;

    setTriggering(action === "trigger_daily" ? "daily" : "settlement");
    try {
      const res = await fetch("/api/admin/daily-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (action === "trigger_daily") {
        toast.success(
          `✅ Daily Return processed: ${data.processed} members | ${data.duplicates} already done today`
        );
      } else {
        toast.success(
          `✅ Settlement complete: ${data.membersSettled} members | $${data.totalAmountSettled?.toLocaleString()} settled`
        );
      }
      load();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setTriggering(null);
    }
  }

  // Computed daily % to display
  const computedDailyPct =
    editMode === "auto"
      ? parseFloat(editMonthlyPct || "0") / 30
      : parseFloat(editManualDailyPct || "0");

  return (
    <DashboardShell>
      <AdminSubnav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-neon-cyan" size={24} />
            Daily Return System
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Configure automated daily profit distribution and monthly settlement
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-xs text-ink-muted font-medium">Total Pending (All Members)</p>
          <p className="font-display text-2xl font-bold mt-1 text-yellow-400">
            ${(stats?.totalPending || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-ink-muted mt-1">{stats?.pendingMembersCount || 0} members with pending balance</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-ink-muted font-medium">Total Settled (All Time)</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-green">
            ${(stats?.totalSettled || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-ink-muted font-medium">Current Daily Rate</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-cyan">
            {config ? parseFloat(config.effectiveDailyPct.toFixed(4)) : "—"}%
          </p>
          <p className="text-xs text-ink-muted mt-1 capitalize">
            Mode: <span className="text-white font-semibold">{config?.mode || "—"}</span>
          </p>
        </div>
      </div>

      {/* ── Config Panel ── */}
      <div className="glass-card p-5 mb-6">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Settings size={18} className="text-neon-violet" /> Return Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Return Mode */}
          <div>
            <label className="block text-xs text-ink-muted mb-1.5 font-semibold">Return Mode</label>
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {(["auto", "manual"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setEditMode(m); setConfigDirty(true); }}
                  className={`flex-1 py-2 text-xs font-semibold capitalize transition ${
                    editMode === m
                      ? "bg-neon-cyan text-black"
                      : "bg-white/5 text-ink-muted hover:bg-white/10"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Return % */}
          <div>
            <label className="block text-xs text-ink-muted mb-1.5 font-semibold">Monthly Return %</label>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={editMonthlyPct}
              onChange={(e) => { setEditMonthlyPct(e.target.value); setConfigDirty(true); }}
              className="input-field w-full text-sm"
            />
          </div>

          {/* Calculated Daily % (read-only in auto) */}
          <div>
            <label className="block text-xs text-ink-muted mb-1.5 font-semibold">
              {editMode === "auto" ? "Calculated Daily % (auto)" : "Manual Daily %"}
            </label>
            {editMode === "auto" ? (
              <div className="input-field w-full text-sm text-neon-cyan font-bold bg-white/5 cursor-not-allowed select-none">
                {isNaN(computedDailyPct) ? "—" : computedDailyPct.toFixed(6)}%{" "}
                <span className="text-[10px] text-ink-muted font-normal">(monthly ÷ 30)</span>
              </div>
            ) : (
              <input
                type="number"
                min={0}
                max={5}
                step={0.01}
                value={editManualDailyPct}
                onChange={(e) => { setEditManualDailyPct(e.target.value); setConfigDirty(true); }}
                className="input-field w-full text-sm"
              />
            )}
          </div>

          {/* Save button */}
          <div className="flex items-end">
            <button
              onClick={handleSaveConfig}
              disabled={savingMode || !configDirty}
              className={`w-full py-2 text-sm font-semibold rounded-xl transition ${
                configDirty
                  ? "btn-primary"
                  : "bg-white/5 text-ink-muted cursor-not-allowed"
              }`}
            >
              {savingMode ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Example calculation */}
        {config && (
          <div className="text-xs text-ink-muted mt-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-white font-semibold">Example: </span>
            Investment $1,000 × {parseFloat((config.effectiveDailyPct).toFixed(4))}% ={" "}
            <span className="text-neon-green font-bold">
              ${parseFloat(((1000 * config.effectiveDailyPct) / 100).toFixed(4))} / day
            </span>
            {"  ·  "}
            <span className="text-neon-cyan">
              ${parseFloat(((1000 * config.monthlyPct) / 100).toFixed(2))} / month ({config.monthlyPct}%)
            </span>
          </div>
        )}
      </div>

      {/* ── Admin Trigger Buttons ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5 border border-neon-cyan/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Play size={16} className="text-neon-cyan" /> Trigger Daily Return
              </h4>
              <p className="text-xs text-ink-muted mt-1">
                Runs daily profit calculation for all active investments right now.
                Skips any member who already received today's return.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleTrigger("trigger_daily")}
            disabled={triggering !== null}
            className="w-full btn-primary py-2 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {triggering === "daily" ? (
              <><RefreshCw size={14} className="animate-spin" /> Processing...</>
            ) : (
              <><Play size={14} /> Run Daily Return Now</>
            )}
          </button>
        </div>

        <div className="glass-card p-5 border border-neon-magenta/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Calendar size={16} className="text-neon-magenta" /> Trigger Monthly Settlement
              </h4>
              <p className="text-xs text-ink-muted mt-1">
                Moves all accumulated daily returns to member wallets. Creates transaction records.
                Normally runs automatically on the 1st of each month.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleTrigger("trigger_settlement")}
            disabled={triggering !== null}
            className="w-full py-2 text-sm font-semibold rounded-xl bg-neon-magenta/20 border border-neon-magenta/30 text-neon-magenta hover:bg-neon-magenta/30 transition flex items-center justify-center gap-2"
          >
            {triggering === "settlement" ? (
              <><RefreshCw size={14} className="animate-spin" /> Settling...</>
            ) : (
              <><Calendar size={14} /> Run Monthly Settlement Now</>
            )}
          </button>
        </div>
      </div>

      {/* ── Records Table ── */}
      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="font-display font-semibold text-lg">Daily Return Records</h3>
          <div className="flex flex-wrap gap-2">
            <input
              className="input-field text-xs py-1.5 w-36"
              placeholder="Member ID..."
              value={filterMemberId}
              onChange={(e) => { setFilterMemberId(e.target.value); setCurrentPage(1); }}
            />
            <input
              type="date"
              className="input-field text-xs py-1.5"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
            />
            <input
              type="date"
              className="input-field text-xs py-1.5"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted py-8 text-center">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">
            No daily return records found. Trigger the daily return above to generate the first batch.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-muted border-b border-white/10 text-xs">
                    <th className="py-2 pr-4">Member ID</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Investment</th>
                    <th className="py-2 pr-4">Daily %</th>
                    <th className="py-2 pr-4">Profit</th>
                    <th className="py-2 pr-4">Running Total</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr
                      key={r._id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2.5 pr-4 font-semibold text-white text-xs">{r.memberId}</td>
                      <td className="py-2.5 pr-4 text-xs text-ink-muted font-mono">{r.date}</td>
                      <td className="py-2.5 pr-4 text-xs">
                        ${r.investmentAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-neon-cyan">
                        {parseFloat(r.dailyPct.toFixed(6))}%
                      </td>
                      <td className="py-2.5 pr-4 text-neon-green font-bold text-xs">
                        +${parseFloat(r.profit.toFixed(4))}
                      </td>
                      <td className="py-2.5 pr-4 text-xs font-medium">
                        ${parseFloat(r.runningTotal.toFixed(4))}
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.settled ? (
                          <span className="flex items-center gap-1 text-[10px] text-neon-green font-semibold">
                            <CheckCircle size={10} /> Settled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-semibold">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <p className="text-xs text-ink-muted">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total records)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40"
                  >
                    <ChevronUp size={12} /> Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage >= pagination.pages}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40"
                  >
                    Next <ChevronDown size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
