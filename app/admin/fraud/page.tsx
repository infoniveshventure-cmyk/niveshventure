"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { ShieldAlert, RefreshCw, AlertTriangle } from "lucide-react";

export default function FraudDetectionPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fraud", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setFlags(data.flags || []);
      }
    } catch {
      toast.error("Failed to load fraud flags");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (memberId: string, isBlocked: boolean) => {
    try {
      const res = await fetch("/api/admin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          action: "block",
          isBlocked,
          adminNote: isBlocked ? "Blocked by Fraud System Rule" : "Unblocked by admin",
        }),
      });
      if (res.ok) {
        toast.success(isBlocked ? "User withdrawals blocked" : "User withdrawals unblocked");
        fetchFlags();
      }
    } catch {
      toast.error("Action failed");
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-neon-magenta animate-pulse" />
            Fraud Detection & Risk Alerts
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Scans and flags duplicate IPs, matching withdrawal rates, and potential multi-accounts.
          </p>
        </div>
        <button
          onClick={fetchFlags}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Re-Analyze
        </button>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Analyzing users...</p>
        ) : flags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="text-neon-green mb-2" size={32} />
            <p className="text-sm text-ink-muted">All clear! No suspicious user patterns flagged.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flags.map((flag) => (
              <div key={flag.memberId} className="flex justify-between items-center p-4 border border-white/5 bg-white/5 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{flag.memberId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      flag.riskScore >= 75 ? "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20" :
                      flag.riskScore >= 40 ? "bg-neon-violet/10 text-neon-violet border border-neon-violet/20" :
                      "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                    }`}>
                      Risk Score: {flag.riskScore}%
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {flag.flags.map((f: any, idx: number) => (
                      <p key={idx} className="text-xs text-ink-muted flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-magenta"></span>
                        {f.reason}
                      </p>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleBlockUser(flag.memberId, !flag.isBlocked)}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition ${
                    flag.isBlocked
                      ? "bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20"
                      : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20 hover:bg-neon-magenta/20"
                  }`}
                >
                  {flag.isBlocked ? "Unblock Withdrawals" : "Block Withdrawals"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
