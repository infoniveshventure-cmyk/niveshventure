"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { Download, RefreshCw, Database } from "lucide-react";

export default function BackupPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setBackups(data.backups || []);
      }
    } catch {
      toast.error("Failed to load backup logs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      if (res.ok) {
        toast.success("Database backup generated successfully");
        fetchBackups();
      } else {
        toast.error("Backup creation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Database className="text-neon-cyan" />
            Backup & Disaster Recovery
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Download local JSON database exports of users, wallets, transactions, and commission settings.
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={actionLoading}
          className="btn-primary flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={actionLoading ? "animate-spin" : ""} />
          Generate Backup
        </button>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading backups...</p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No backup exports recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {backups.map((b) => (
              <div key={b.filename} className="flex justify-between items-center p-3 border border-white/5 bg-white/5 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-white font-mono">{b.filename}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    Generated on {new Date(b.createdAt).toLocaleString()} · Size: {(b.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <a
                  href={`/backups/${b.filename}`}
                  download
                  className="p-2 border border-white/10 hover:border-white/20 bg-white/5 rounded-xl text-ink transition-all"
                >
                  <Download size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
