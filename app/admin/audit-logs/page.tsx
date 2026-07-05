"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import { RefreshCw, Search } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&q=${encodeURIComponent(search)}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotalPages(data.pages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">System Audit Logs</h1>
          <p className="text-sm text-ink-muted mt-1">Immutable tracking of all admin and critical activities.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-ink-muted" size={16} />
          <input
            type="text"
            placeholder="Search by Actor ID, Name, Action Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-10 text-sm py-2"
          />
        </div>
        <button onClick={() => { setPage(1); fetchLogs(); }} className="btn-primary px-6 py-2 text-sm">
          Search
        </button>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No audit logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-muted">
              <thead>
                <tr className="border-b border-white/10 pb-2">
                  <th className="py-2 text-white font-semibold">Time</th>
                  <th className="py-2 text-white font-semibold">Actor</th>
                  <th className="py-2 text-white font-semibold">Action</th>
                  <th className="py-2 text-white font-semibold">Target</th>
                  <th className="py-2 text-white font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-white font-medium">{log.actorName || log.actorId}</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{log.actionType}</span></td>
                    <td className="py-3">{log.targetMemberId || "N/A"}</td>
                    <td className="py-3">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 border border-white/10 rounded-xl text-xs disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-xs text-ink-muted">Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 border border-white/10 rounded-xl text-xs disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </DashboardShell>
  );
}
