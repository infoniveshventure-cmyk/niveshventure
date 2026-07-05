"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { RefreshCw, Plus, Search, Check } from "lucide-react";

export default function AdminPinManagementPage() {
  const [pins, setPins] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk generation input
  const [generateQty, setGenerateQty] = useState(10);
  const [generateType, setGenerateType] = useState("paid");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Activation inputs
  const [pinCodeToUse, setPinCodeToUse] = useState("");
  const [targetMemberId, setTargetMemberId] = useState("");

  const fetchPins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/pins?status=${statusFilter}&type=${typeFilter}&q=${encodeURIComponent(searchQuery)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to load PIN inventory");
      const json = await res.json();
      setPins(json.pins || []);
      setStats(json.stats || null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching PINs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const handleBulkGenerate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: generateQty,
          type: generateType,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate PINs");
      toast.success(`Successfully generated ${result.count} PINs!`);
      fetchPins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyPin = async () => {
    if (!pinCodeToUse || !targetMemberId) {
      toast.error("Please enter both PIN code and Target User Member ID");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/pins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pinCodeToUse,
          targetMemberId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to apply PIN");
      toast.success("Account activated successfully!");
      setPinCodeToUse("");
      setTargetMemberId("");
      fetchPins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">PIN Management System</h1>
          <p className="text-sm text-ink-muted mt-1">
            Generate, allocate, and use PINs to activate user IDs with premium rules.
          </p>
        </div>
        <button
          onClick={fetchPins}
          disabled={actionLoading}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={actionLoading ? "animate-spin" : ""} />
          Refresh Stock
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <span className="text-xs text-ink-muted">Total PIN Stock</span>
          <p className="font-display text-xl font-bold mt-1 text-white">{stats?.totalStock || 0}</p>
        </div>
        <div className="stat-card">
          <span className="text-xs text-ink-muted">Unused PINs</span>
          <p className="font-display text-xl font-bold mt-1 text-neon-green">{stats?.unusedCount || 0}</p>
        </div>
        <div className="stat-card">
          <span className="text-xs text-ink-muted">Used PINs</span>
          <p className="font-display text-xl font-bold mt-1 text-ink-muted">{stats?.usedCount || 0}</p>
        </div>
        <div className="stat-card">
          <span className="text-xs text-ink-muted">Free Activation PINs</span>
          <p className="font-display text-xl font-bold mt-1 text-neon-cyan">{stats?.freeCount || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Bulk PIN Generation */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-neon-cyan" />
            Generate PINs in Bulk
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-ink-muted mb-1">Quantity</label>
              <select
                value={generateQty}
                onChange={(e) => setGenerateQty(Number(e.target.value))}
                className="input-field w-full text-xs py-2 bg-black"
              >
                <option value="10">Generate 10 PINs</option>
                <option value="100">Generate 100 PINs</option>
                <option value="250">Generate 250 PINs</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">PIN Type</label>
              <select
                value={generateType}
                onChange={(e) => setGenerateType(e.target.value)}
                className="input-field w-full text-xs py-2 bg-black"
              >
                <option value="paid">Paid PIN ($30 value)</option>
                <option value="free">Free PIN ($0 value - no commission payouts)</option>
              </select>
            </div>
            <button
              onClick={handleBulkGenerate}
              disabled={actionLoading}
              className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
            >
              Generate PINs
            </button>
          </div>
        </div>

        {/* Apply PIN / Account Activation */}
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Check size={16} className="text-neon-green" />
            ID Activation using PIN Code
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-ink-muted mb-1">Enter PIN Code</label>
                <input
                  type="text"
                  placeholder="PIN-XXXXXXXX"
                  value={pinCodeToUse}
                  onChange={(e) => setPinCodeToUse(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-muted mb-1">Target User Member ID</label>
                <input
                  type="text"
                  placeholder="e.g. MBR1002"
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>
            </div>
            <button
              onClick={handleApplyPin}
              disabled={actionLoading}
              className="btn-primary w-full py-2.5 text-xs font-semibold"
            >
              Apply PIN & Activate Account
            </button>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="font-display font-semibold text-white">PIN Inventory & Stock History</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-ink outline-none cursor-pointer"
            >
              <option value="" className="bg-black">All Statuses</option>
              <option value="unused" className="bg-black">Unused Only</option>
              <option value="used" className="bg-black">Used Only</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-ink outline-none cursor-pointer"
            >
              <option value="" className="bg-black">All Types</option>
              <option value="paid" className="bg-black">Paid Only</option>
              <option value="free" className="bg-black">Free Only</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-2 text-ink-muted" size={12} />
              <input
                type="text"
                placeholder="Search PIN / User ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPins()}
                className="input-field pl-8 text-xs py-1.5 w-48"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted text-center py-8">Loading PIN data...</p>
        ) : pins.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No matching PIN records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="border-b border-white/10 pb-2">
                  <th className="py-2 text-white font-semibold">PIN Code</th>
                  <th className="py-2 text-white font-semibold">Value</th>
                  <th className="py-2 text-white font-semibold">Type</th>
                  <th className="py-2 text-white font-semibold">Status</th>
                  <th className="py-2 text-white font-semibold">Used By</th>
                  <th className="py-2 text-white font-semibold">Used Date</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((p) => (
                  <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-mono text-white font-semibold">{p.code}</td>
                    <td className="py-2.5">${p.value}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        p.type === "free" ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20" : "bg-neon-violet/10 text-neon-violet border border-neon-violet/20"
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        p.status === "unused" ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-white/5 text-ink-muted"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5">{p.usedBy || "—"}</td>
                    <td className="py-2.5">{p.usedAt ? new Date(p.usedAt).toLocaleDateString() : "—"}</td>
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
