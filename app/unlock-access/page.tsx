"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import { Unlock, ShieldAlert, Sparkles, Clock } from "lucide-react";
import { TxRecord } from "@/components/TransactionHistory";

const WALLET_LABELS: Record<string, string> = {
  main: "Main Wallet",
  booster: "Booster Wallet",
  nivesh: "Nivesh Wallet",
  usdt: "USDT Wallet",
};

export default function UnlockAccessPage() {
  const { profile, refreshProfile } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [isExpired, setIsExpired] = useState(true);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  // Activate another account modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetInfo, setTargetInfo] = useState<{ fullName: string; isActive: boolean; memberId: string } | null>(null);
  const [targetError, setTargetError] = useState("");
  const [modalWallet, setModalWallet] = useState("main");
  const [modalBusy, setModalBusy] = useState(false);

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

  // Target ID lookup listener
  useEffect(() => {
    if (!targetId || targetId.trim().length < 3) {
      setTargetInfo(null);
      setTargetError("");
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setTargetLoading(true);
      setTargetError("");
      try {
        const res = await fetch(`/api/user/lookup?memberId=${encodeURIComponent(targetId.trim())}&purpose=activation`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to look up user");
        }
        setTargetInfo(data);
      } catch (err: any) {
        setTargetInfo(null);
        setTargetError(err.message || "User not found");
      } finally {
        setTargetLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [targetId]);

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

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            disabled={isButtonDisabled}
            onClick={renew}
            className={`flex-1 py-3.5 rounded-xl font-display font-semibold transition-all duration-300 ${
              isButtonDisabled
                ? "bg-white/5 text-ink-muted border border-white/5 cursor-not-allowed"
                : "btn-primary shadow-neon text-white hover:scale-[1.02]"
            }`}
          >
            {busy ? "Processing..." : !isExpired && status?.isActive ? "Access Unlocked (Active)" : `Activate Account ($30)`}
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 py-3.5 rounded-xl font-display font-semibold transition-all duration-300 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 hover:scale-[1.02] flex items-center justify-center gap-1"
          >
            Activate Another Account
          </button>
        </div>
      </div>

      {/* Activate Another Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="text-neon-cyan" size={18} /> Activate Another Account
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-ink-muted block mb-1.5 font-medium">Target User ID</label>
                <input
                  type="text"
                  placeholder="e.g. NV123456"
                  className="input-field w-full"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                />
              </div>

              {targetLoading && (
                <p className="text-xs text-ink-muted animate-pulse">Checking member details...</p>
              )}

              {targetError && (
                <p className="text-xs text-neon-magenta">{targetError}</p>
              )}

              {targetInfo && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">User Name:</span>
                    <span className="font-bold text-white">{targetInfo.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Account Status:</span>
                    <span className={`font-bold ${targetInfo.isActive ? "text-neon-green" : "text-neon-magenta"}`}>
                      {targetInfo.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Activation Fee:</span>
                    <span className="font-bold text-neon-cyan">$30</span>
                  </div>
                </div>
              )}

              {/* Wallet Selection */}
              {status?.wallets && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1.5 font-medium">Select Wallet to Pay From</label>
                  <div className="relative">
                    <select
                      className="input-field w-full appearance-none pr-8 text-sm cursor-pointer"
                      value={modalWallet}
                      onChange={(e) => setModalWallet(e.target.value)}
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
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={modalBusy || !targetInfo || targetInfo.isActive}
                onClick={async () => {
                  setModalBusy(true);
                  try {
                    const res = await fetch("/api/unlock-access", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        walletType: modalWallet,
                        targetMemberId: targetInfo?.memberId,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    toast.success("Account activated successfully!");
                    setIsModalOpen(false);
                    setTargetId("");
                    setTargetInfo(null);
                    load();
                    refreshProfile();
                  } catch (err: any) {
                    toast.error(err.message || "Activation failed");
                  } finally {
                    setModalBusy(false);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl font-display font-semibold transition-all duration-300 ${
                  modalBusy || !targetInfo || targetInfo.isActive
                    ? "bg-white/5 text-ink-muted border border-white/5 cursor-not-allowed"
                    : "btn-primary shadow-neon text-white hover:scale-[1.02]"
                }`}
              >
                {modalBusy ? "Processing..." : targetInfo?.isActive ? "Already Active" : "Activate"}
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setTargetId("");
                  setTargetInfo(null);
                  setTargetError("");
                }}
                className="flex-1 py-2.5 text-sm rounded-xl border border-white/10 hover:bg-white/5 text-ink-muted transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation History Table */}
      <div className="mt-8 glass-card p-6 border border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-neon-cyan" />
          <h2 className="font-display font-semibold text-lg text-white">Activation History</h2>
          <span className="text-xs text-ink-muted ml-auto">{txHistory.length} records</span>
        </div>

        {txLoading ? (
          <p className="text-sm text-ink-muted py-8 text-center animate-pulse">Loading activation history...</p>
        ) : txHistory.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No activation transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-ink-muted border-b border-white/10 text-xs">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Transaction ID</th>
                  <th className="py-2 pr-3">Payer User ID</th>
                  <th className="py-2 pr-3">Target User ID</th>
                  <th className="py-2 pr-3">Target User Name</th>
                  <th className="py-2 pr-3">Wallet Used</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {txHistory.map((tx) => {
                  const dateObj = new Date(tx.createdAt);
                  const dateStr = dateObj.toLocaleDateString();
                  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  // Payer is either senderMemberId or memberId (for self-activation)
                  const payerId = tx.senderMemberId || tx.memberId;
                  // Target is either receiverMemberId or memberId (for self-activation)
                  const targetId = tx.receiverMemberId || tx.memberId;
                  const targetName = tx.receiverName || (targetId === profile?.memberId ? profile?.fullName : "Self");

                  return (
                    <tr key={tx._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors text-xs text-ink-muted">
                      <td className="py-3 pr-3 whitespace-nowrap text-white">{dateStr}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{timeStr}</td>
                      <td className="py-3 pr-3 font-mono text-[10px]" title={tx._id}>
                        {tx._id.toUpperCase()}
                      </td>
                      <td className="py-3 pr-3 font-mono">{payerId}</td>
                      <td className="py-3 pr-3 font-mono">{targetId}</td>
                      <td className="py-3 pr-3 text-white">{targetName}</td>
                      <td className="py-3 pr-3 capitalize">{WALLET_LABELS[tx.walletType || "main"] || "Main Wallet"}</td>
                      <td className="py-3 pr-3 font-bold text-white">${tx.amount.toLocaleString()}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          tx.status === "completed" 
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                            : tx.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                        }`}>
                          {tx.status === "completed" ? "Success" : tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
