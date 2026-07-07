"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";
import { 
  FileText, 
  Calendar, 
  Search, 
  RefreshCw, 
  PiggyBank, 
  Unlock, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface TxEntry {
  _id: string;
  amount: number;
  status: string;
  note?: string;
  description?: string;
  createdAt: string;
}

export default function StatementPage() {
  const [data, setData] = useState<{ nivesh: TxEntry[]; renewal: TxEntry[]; unlock: TxEntry[] } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Active filters applied on Search click
  const [activeFilters, setActiveFilters] = useState({
    start: "",
    end: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    let url = "/api/statement?";
    if (activeFilters.start) url += `startDate=${activeFilters.start}&`;
    if (activeFilters.end) url += `endDate=${activeFilters.end}`;
    
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load statements");
      }
    } catch {
      toast.error("Error loading account statement data");
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters({
      start: startDate,
      end: endDate,
    });
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setActiveFilters({
      start: "",
      end: "",
    });
  };

  // Calculate totals based on the fetched data (which is already filtered by date range at the database level)
  const totals = useMemo(() => {
    const totalNivesh = (data?.nivesh || []).reduce((acc, entry) => acc + entry.amount, 0);
    const totalRenewal = (data?.renewal || []).reduce((acc, entry) => acc + entry.amount, 0);
    const totalUnlock = (data?.unlock || []).reduce((acc, entry) => acc + entry.amount, 0);
    return {
      nivesh: totalNivesh,
      renewal: totalRenewal,
      unlock: totalUnlock,
    };
  }, [data]);

  return (
    <DashboardShell>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <FileText className="text-neon-cyan" /> Account Statement
        </h1>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 border border-white/10"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Recalculating Totals Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 border-neon-cyan/20">
          <p className="text-xs text-ink-muted flex items-center gap-1"><PiggyBank size={12} /> Total Nivesh Amount</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-cyan">
            ${totals.nivesh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-5 border-neon-violet/20">
          <p className="text-xs text-ink-muted flex items-center gap-1"><RotateCcw size={12} /> Total Renewal Amount</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-violet">
            ${totals.renewal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-5 border-neon-green/20">
          <p className="text-xs text-ink-muted flex items-center gap-1"><Unlock size={12} /> Total Access Unlock Amount</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-green">
            ${totals.unlock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Date Filters Form */}
      <form onSubmit={handleSearch} className="glass-card p-5 mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs text-ink-muted block mb-1">From Date</label>
          <input
            type="date"
            className="input-field text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-ink-muted block mb-1">To Date</label>
          <input
            type="date"
            className="input-field text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost text-xs py-2 px-4 flex-1 md:flex-initial"
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn-primary text-xs py-2 px-6 flex-1 md:flex-initial flex items-center justify-center gap-1.5"
          >
            <Search size={13} /> Search
          </button>
        </div>
      </form>

      {/* History Sections */}
      <div className="space-y-8">
        
        {/* Nivesh History */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-sm text-neon-cyan flex items-center gap-1.5">
            <PiggyBank size={16} /> Nivesh History
          </h2>
          {loading ? (
            <p className="text-xs text-ink-muted py-4">Loading Nivesh history...</p>
          ) : !data?.nivesh?.length ? (
            <p className="text-xs text-ink-muted py-4 text-center">No Nivesh records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-3">Date & Time</th>
                    <th className="py-2.5 pr-3">Transaction ID</th>
                    <th className="py-2.5 pr-3">Amount (USD)</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nivesh.map((e) => (
                    <tr key={e._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-3 text-ink-muted whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[10px] text-ink-muted">
                        {e._id.toUpperCase()}
                      </td>
                      <td className="py-3 pr-3 font-bold text-white">
                        ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          e.status === "completed" 
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                            : e.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                        }`}>
                          {e.status === "completed" ? "Success" : e.status === "pending" ? "Pending" : "Failed"}
                        </span>
                      </td>
                      <td className="py-3 text-ink-muted max-w-[250px] truncate" title={e.note || e.description}>
                        {e.note || e.description || "Nivesh Investment"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Renewal History */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-sm text-neon-violet flex items-center gap-1.5">
            <RotateCcw size={16} /> Renewal History
          </h2>
          {loading ? (
            <p className="text-xs text-ink-muted py-4">Loading Renewal history...</p>
          ) : !data?.renewal?.length ? (
            <p className="text-xs text-ink-muted py-4 text-center">No Renewal records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-3">Date & Time</th>
                    <th className="py-2.5 pr-3">Transaction ID</th>
                    <th className="py-2.5 pr-3">Amount (USD)</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.renewal.map((e) => (
                    <tr key={e._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-3 text-ink-muted whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[10px] text-ink-muted">
                        {e._id.toUpperCase()}
                      </td>
                      <td className="py-3 pr-3 font-bold text-white">
                        ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          e.status === "completed" 
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                            : e.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                        }`}>
                          {e.status === "completed" ? "Success" : e.status === "pending" ? "Pending" : "Failed"}
                        </span>
                      </td>
                      <td className="py-3 text-ink-muted max-w-[250px] truncate" title={e.note || e.description}>
                        {e.note || e.description || "Premium Renewal"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Access Unlock History */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-sm text-neon-green flex items-center gap-1.5">
            <Unlock size={16} /> Access Unlock History
          </h2>
          {loading ? (
            <p className="text-xs text-ink-muted py-4">Loading Access Unlock history...</p>
          ) : !data?.unlock?.length ? (
            <p className="text-xs text-ink-muted py-4 text-center">No Access Unlock records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-3">Date & Time</th>
                    <th className="py-2.5 pr-3">Transaction ID</th>
                    <th className="py-2.5 pr-3">Amount (USD)</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unlock.map((e) => (
                    <tr key={e._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-3 text-ink-muted whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[10px] text-ink-muted">
                        {e._id.toUpperCase()}
                      </td>
                      <td className="py-3 pr-3 font-bold text-white">
                        ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          e.status === "completed" 
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                            : e.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                        }`}>
                          {e.status === "completed" ? "Success" : e.status === "pending" ? "Pending" : "Failed"}
                        </span>
                      </td>
                      <td className="py-3 text-ink-muted max-w-[250px] truncate" title={e.note || e.description}>
                        {e.note || e.description || "Access Unlock Fee Paid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
