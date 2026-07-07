"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import { 
  TrendingUp, 
  Settings, 
  Calendar, 
  Clock, 
  Play, 
  Users, 
  ShieldAlert, 
  FileText, 
  Search, 
  RefreshCw, 
  CheckSquare, 
  Square 
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminIncomeDistributionPage() {
  const [settings, setSettings] = useState<any>({
    roiAutoMode: false,
    roiPercentage: 6.0,
    roiStartDate: "",
    roiCreditTime: "00:00",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual ROI states
  const [manualPercentage, setManualPercentage] = useState(6.0);
  const [period, setPeriod] = useState("");
  const [previewList, setPreviewList] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Audit trail logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Load Website Settings, Preview, and Audit Logs
  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setSettings({
          roiAutoMode: d.settings?.roiAutoMode ?? false,
          roiPercentage: d.settings?.roiPercentage ?? 6.0,
          roiStartDate: d.settings?.roiStartDate ?? "",
          roiCreditTime: d.settings?.roiCreditTime ?? "00:00",
        });
      }

      // Default the period to current year-month (YYYY-MM)
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setPeriod(currentPeriod);

      await fetchPreview(6.0);
      await fetchAuditLogs();
    } catch (e) {
      toast.error("Failed to load settings");
    }
  };

  const fetchPreview = async (pct: number) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/income-distribution?percentage=${pct}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setPreviewList(d.preview || []);
        setSelectedUserIds((d.preview || []).map((p: any) => p.memberId)); // Default select all
      }
    } catch {
      toast.error("Failed to load ROI preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/audit-logs", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        // Filter audit logs specifically for income distribution events
        const distLogs = (d.logs || []).filter(
          (log: any) => log.actionType === "income_distribution" || log.actionType === "auto_income_distribution"
        );
        setAuditLogs(distLogs);
      }
    } catch {
      console.error("Failed to load audit logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Auto Mode Scheduler Configurations
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Auto Mode scheduler settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Error saving settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Select/Deselect User Checkbox Toggle
  const toggleSelectUser = (memberId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === previewList.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(previewList.map((p) => p.memberId));
    }
  };

  // Trigger Manual Credit Returns
  const handleCreditReturns = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user to credit");
      return;
    }
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      toast.error("Please specify a valid credit period (YYYY-MM)");
      return;
    }

    const confirmMsg = `Are you sure you want to manually credit ${manualPercentage}% ROI and Level Returns to ${selectedUserIds.length} users for period ${period}? Duplicate protection will skip users already paid for this period.`;
    if (!confirm(confirmMsg)) return;

    setDistributing(true);
    try {
      const res = await fetch("/api/admin/income-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentage: manualPercentage,
          memberIds: selectedUserIds,
          period,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`ROI Credited: Paid ${data.creditedCount} users, Skipped ${data.duplicateSkipped} duplicates!`);
        await fetchAuditLogs();
        await fetchPreview(manualPercentage);
      } else {
        toast.error(data.error || "Distribution failed");
      }
    } catch {
      toast.error("Failed to execute income distribution");
    } finally {
      setDistributing(false);
    }
  };

  return (
    <DashboardShell>
      <AdminSubnav />
      <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp className="text-neon-cyan" /> Income Distribution Logic
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Auto Mode Configuration Scheduler */}
        <div className="glass-card p-6 space-y-4 border-neon-cyan/15 h-fit">
          <h2 className="font-display font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Settings size={16} className="text-neon-cyan" /> 1. Auto Mode Scheduler
          </h2>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-semibold text-white">Auto Mode Status</p>
              <p className="text-[10px] text-ink-muted">ON runs cron at scheduled Date/Time</p>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-white/10 accent-neon-cyan cursor-pointer"
              checked={settings.roiAutoMode}
              onChange={(e) => setSettings({ ...settings, roiAutoMode: e.target.checked })}
            />
          </div>

          <div>
            <label className="text-[10px] text-ink-muted block mb-1">Monthly Return Percentage</label>
            <select
              className="input-field py-1.5 text-xs"
              value={settings.roiPercentage}
              onChange={(e) => setSettings({ ...settings, roiPercentage: Number(e.target.value) })}
            >
              <option value={5.0}>5% ROI Return</option>
              <option value={6.0}>6% ROI Return</option>
              <option value={7.0}>7% ROI Return</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-ink-muted block mb-1 flex items-center gap-1"><Calendar size={11} /> Start Date</label>
            <input
              type="date"
              className="input-field text-xs py-1"
              value={settings.roiStartDate}
              onChange={(e) => setSettings({ ...settings, roiStartDate: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] text-ink-muted block mb-1 flex items-center gap-1"><Clock size={11} /> Credit Time</label>
            <input
              type="time"
              className="input-field text-xs py-1"
              value={settings.roiCreditTime}
              onChange={(e) => setSettings({ ...settings, roiCreditTime: e.target.value })}
            />
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
          >
            <Play size={12} /> {savingSettings ? "Saving Settings..." : "Save Scheduler Rules"}
          </button>
        </div>

        {/* Manual Mode Distribution Controls */}
        <div className="glass-card p-6 lg:col-span-2 space-y-4 border-neon-violet/15">
          <h2 className="font-display font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Users size={16} className="text-neon-violet" /> 2. Manual Mode Credit
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-ink-muted block mb-1">Select ROI Percentage</label>
              <select
                className="input-field py-1.5 text-xs"
                value={manualPercentage}
                onChange={(e) => {
                  setManualPercentage(Number(e.target.value));
                  fetchPreview(Number(e.target.value));
                }}
              >
                <option value={5.0}>5% ROI Return</option>
                <option value={6.0}>6% ROI Return</option>
                <option value={7.0}>7% ROI Return</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-ink-muted block mb-1">Specify Credit Period (YYYY-MM)</label>
              <input
                type="text"
                placeholder="e.g. 2026-07"
                className="input-field text-xs py-1"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCreditReturns}
                disabled={distributing || previewList.length === 0}
                className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-neon-violet to-neon-magenta border-none disabled:opacity-50"
              >
                {distributing ? "Processing Credit..." : `Credit Returns (${selectedUserIds.length})`}
              </button>
            </div>
          </div>

          {/* Preview list */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Eligible Users Preview</span>
              <button
                onClick={toggleSelectAll}
                className="text-[10px] text-neon-cyan hover:underline flex items-center gap-1"
              >
                {selectedUserIds.length === previewList.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {loadingPreview ? (
              <p className="text-xs text-ink-muted py-6 animate-pulse text-center">Recalculating preview values...</p>
            ) : previewList.length === 0 ? (
              <p className="text-xs text-ink-muted py-6 text-center">No active users with investments found.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-white/5 rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-white/5 sticky top-0 border-b border-white/10 uppercase text-[9px] text-ink-muted">
                    <tr>
                      <th className="py-2 px-3 w-8">Select</th>
                      <th className="py-2 pr-3">Member ID</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Investment</th>
                      <th className="py-2 pr-3">ROI Return</th>
                      <th className="py-2">Level Returns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewList.map((p) => {
                      const isSelected = selectedUserIds.includes(p.memberId);
                      return (
                        <tr key={p.memberId} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                          <td className="py-2 px-3">
                            <button type="button" onClick={() => toggleSelectUser(p.memberId)} className="text-neon-cyan">
                              {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                            </button>
                          </td>
                          <td className="py-2 pr-3 font-semibold text-white">{p.memberId}</td>
                          <td className="py-2 pr-3 text-ink-muted truncate max-w-[100px]">{p.fullName}</td>
                          <td className="py-2 pr-3 font-bold">${p.totalInvestment.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-neon-green font-bold">${p.roiAmount.toLocaleString()}</td>
                          <td className="py-2 text-neon-cyan font-bold">${p.levelIncomeAmount.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit History & Audit Trail logs */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <h2 className="font-display font-semibold text-base flex items-center gap-2 text-white">
            <FileText size={16} className="text-neon-cyan" /> Complete Credit History & Audit Log
          </h2>
          <button onClick={fetchAuditLogs} disabled={loadingLogs} className="text-xs text-neon-cyan hover:underline flex items-center gap-1">
            <RefreshCw size={11} className={loadingLogs ? "animate-spin" : ""} /> Refresh Logs
          </button>
        </div>

        {loadingLogs ? (
          <p className="text-xs text-ink-muted py-8 text-center animate-pulse">Loading transaction logs...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-ink-muted py-8 text-center">No income distribution records logged yet.</p>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 pr-4">Date & Time</th>
                  <th className="py-2.5 pr-4">Log Action</th>
                  <th className="py-2.5 pr-4">Admin Actor</th>
                  <th className="py-2.5">Distribution Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4 text-ink-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono font-bold text-neon-cyan uppercase">
                      {(log.actionType || "").replace(/_/g, " ")}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-white">{log.actorName || log.actorId}</td>
                    <td className="py-3 text-ink-muted leading-relaxed max-w-md">
                      {log.metadata?.adminRemarks || "Distributed income."}
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
