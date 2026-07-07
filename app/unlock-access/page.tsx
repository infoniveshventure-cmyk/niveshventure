"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import { Unlock, ShieldAlert, Sparkles, Clock } from "lucide-react";
import TransactionHistory, { TxRecord } from "@/components/TransactionHistory";

export default function UnlockAccessPage() {
  const { profile, refreshProfile } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [isExpired, setIsExpired] = useState(true);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  function load() {
    fetch("/api/unlock-access", { cache: "no-store" }).then((r) => r.json()).then(setStatus);
    fetch("/api/transactions?type=activation", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTxHistory(d.transactions || []))
      .finally(() => setTxLoading(false));
  }
  
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!status?.accessExpiresAt) {
      setCountdown("");
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      const diff = new Date(status.accessExpiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setIsExpired(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const [selectedWallet, setSelectedWallet] = useState("main");

  async function renew() {
    setBusy(true);
    try {
      const res = await fetch("/api/unlock-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletType: selectedWallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Access renewed for 365 days");
      load();
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Renewal failed");
    } finally {
      setBusy(false);
    }
  }

  const isButtonDisabled = busy || (!isExpired && status?.isActive);

  return (
    <DashboardShell>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-neon-cyan" size={24} />
        <h1 className="font-display text-2xl font-bold text-white">Unlock Access Center</h1>
      </div>

      <div className="glass-card p-8 max-w-lg text-center border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-neon-cyan/20 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-neon-violet/20 rounded-full filter blur-3xl"></div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mx-auto mb-6 shadow-neon-sm">
          <Unlock size={28} className="text-white animate-pulse" />
        </div>
        
        <p className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Account Owner</p>
        <p className="font-display text-lg font-bold text-white mb-6 mt-1">
          {profile?.fullName} <span className="text-ink-muted text-sm font-normal">({profile?.memberId})</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-xs text-ink-muted mb-1 font-medium">Access Status</p>
            <p className={`text-lg font-bold ${status?.isActive ? "text-neon-green" : "text-neon-magenta"}`}>
              {status?.isActive ? "Active Unlocked" : "Inactive Locked"}
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center flex flex-col justify-center">
            <p className="text-xs text-ink-muted mb-1 font-medium flex items-center justify-center gap-1">
              <Clock size={12} className="text-neon-cyan" /> Remaining Time
            </p>
            <p className="text-sm font-mono font-bold text-white mt-0.5">
              {countdown || "No Active Access"}
            </p>
          </div>
        </div>

        {/* Wallet Selector for Account Activation */}
        {!status?.isActive && status?.wallets && (
          <div className="mb-6 text-left">
            <label className="text-xs text-ink-muted block mb-1.5 font-medium">Select Wallet to Pay From</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-8 text-sm"
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
              >
                {status.wallets.map((w: any) => (
                  <option key={w.key} value={w.key}>
                    {w.label} (Balance: ${w.balance.toLocaleString()})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">▼</div>
            </div>
          </div>
        )}

        <div className="bg-neon-violet/10 border border-neon-violet/20 rounded-2xl p-4 mb-8 text-left flex items-start gap-3">
          <ShieldAlert className="text-neon-violet shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-semibold text-white">Activation Information</h4>
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
              Activating your account requires a fee of <span className="text-neon-cyan font-bold">$30</span>. This will guarantee account activation eligibility and binary MLM payout structure access for 365 days.
            </p>
          </div>
        </div>

        <button
          disabled={isButtonDisabled}
          onClick={renew}
          className={`w-full py-3.5 rounded-xl font-display font-semibold transition-all duration-300 ${
            isButtonDisabled
              ? "bg-white/5 text-ink-muted border border-white/5 cursor-not-allowed"
              : "btn-primary shadow-neon text-white hover:scale-[1.02]"
          }`}
        >
          {busy ? "Processing..." : !isExpired && status?.isActive ? "Access Unlocked (Active)" : `Activate Account ($30)`}
        </button>
      </div>

      {/* Activation Transaction History */}
      <div className="mt-6">
        <TransactionHistory
          title="Activation History"
          transactions={txHistory}
          loading={txLoading}
          currentUserName={profile?.fullName || ""}
          emptyMessage="No activation transactions yet."
        />
      </div>
    </DashboardShell>
  );
}
