"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import { RefreshCw } from "lucide-react";

export default function LedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("");

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/admin/ledger?month=${currentMonth}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Accounting Ledger</h1>
          <p className="text-sm text-ink-muted mt-1">Trace double-entry credit and debit transactions.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-ink outline-none cursor-pointer focus:border-neon-magenta transition"
          />
          <button
            onClick={fetchLedger}
            className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading ledger entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No ledger transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="border-b border-white/10 pb-2">
                  <th className="py-2 text-white font-semibold">Debit Account</th>
                  <th className="py-2 text-white font-semibold">Credit Account</th>
                  <th className="py-2 text-white font-semibold">Amount</th>
                  <th className="py-2 text-white font-semibold">Description</th>
                  <th className="py-2 text-white font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 text-neon-magenta font-mono">{entry.debitAccount}</td>
                    <td className="py-3 text-neon-green font-mono">{entry.creditAccount}</td>
                    <td className="py-3 text-white font-semibold">${entry.amount.toFixed(2)}</td>
                    <td className="py-3">{entry.description}</td>
                    <td className="py-3">{new Date(entry.createdAt).toLocaleString()}</td>
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
