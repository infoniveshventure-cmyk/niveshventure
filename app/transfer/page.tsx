"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import toast from "react-hot-toast";
import PasswordInput from "@/components/ui/PasswordInput";
import { Send, Clock, Share2, Copy, Wallet, ChevronDown } from "lucide-react";

type WalletOption = { key: string; label: string; balance: number };
type TransferRecord = {
  _id: string;
  type: "p2p_transfer_in" | "p2p_transfer_out";
  direction: "credit" | "debit";
  amount: number;
  walletType: string;
  senderName?: string;
  receiverName?: string;
  senderMemberId?: string;
  receiverMemberId?: string;
  note: string;
  status: string;
  createdAt: string;
};

const WALLET_LABELS: Record<string, string> = {
  main: "Main Wallet",
  booster: "Booster Wallet",
  nivesh: "Nivesh Wallet",
  usdt: "USDT Wallet",
};

function ShareModal({ tx, onClose }: { tx: TransferRecord; onClose: () => void }) {
  const shareText = `💸 P2P Transfer Receipt
━━━━━━━━━━━━━━━━━━━
Type: ${tx.type === "p2p_transfer_out" ? "Sent" : "Received"}
Amount: $${tx.amount.toLocaleString()}
Wallet: ${WALLET_LABELS[tx.walletType] || tx.walletType}
From: ${tx.senderName || "—"} (${tx.senderMemberId || "—"})
To: ${tx.receiverName || "—"} (${tx.receiverMemberId || "—"})
Date: ${new Date(tx.createdAt).toLocaleString()}
Status: ${tx.status}
Transaction ID: ${tx._id}
━━━━━━━━━━━━━━━━━━━
Nivesh Ventures`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText).then(() => toast.success("Copied to clipboard!"));
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "P2P Transfer", text: shareText });
      } catch {}
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-6 space-y-4">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Share2 size={18} className="text-neon-cyan" /> Share Transaction
        </h3>
        <pre className="bg-base-soft rounded-xl p-4 text-xs text-ink-muted whitespace-pre-wrap font-mono leading-relaxed">{shareText}</pre>
        <div className="flex gap-3">
          <button onClick={nativeShare} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <Share2 size={14} /> Share
          </button>
          <button onClick={copyToClipboard} className="flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-xl border border-white/15 hover:bg-white/5 transition text-ink">
            <Copy size={14} /> Copy
          </button>
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-xl border border-white/10 hover:bg-white/5 text-ink-muted transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransferPage() {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("main");
  const [receiverWallet, setReceiverWallet] = useState("main");
  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [amount, setAmount] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [shareTarget, setShareTarget] = useState<TransferRecord | null>(null);
  const [p2pEnabled, setP2pEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/p2p-transfer", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
        setHistory(data.history || []);
        setP2pEnabled(data.p2pEnabled !== false);
      }
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced receiver lookup
  useEffect(() => {
    const term = receiverId.trim();
    if (term.length < 5) { setReceiverName(""); return; }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/lookup?memberId=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = await res.json();
          setReceiverName(data.fullName || "");
        } else {
          setReceiverName("");
        }
      } catch { setReceiverName(""); }
    }, 500);
    return () => clearTimeout(delay);
  }, [receiverId]);

  const selectedWalletInfo = wallets.find((w) => w.key === selectedWallet);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p2pEnabled) {
      toast.error("P2P Transfers are temporarily disabled.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/p2p-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          amount: Number(amount),
          accessKey,
          remarks,
          walletType: selectedWallet,
          receiverWalletType: receiverWallet,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`$${Number(amount).toLocaleString()} sent to ${data.receiverName}`);
      setReceiverId(""); setAmount(""); setAccessKey(""); setRemarks(""); setReceiverName("");
      await loadData(); // Refresh wallets + history
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
        <Send size={22} className="text-neon-cyan" /> P2P Transfer
      </h1>

      {!p2pEnabled && (
        <div className="glass-card border-neon-magenta/40 p-5 mb-6 text-neon-magenta text-center text-sm font-semibold">
          P2P Transfers are temporarily disabled by the administrator.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <form onSubmit={submit} className="glass-card p-6 space-y-4">
          <h2 className="font-display font-semibold mb-2">Send Funds</h2>

          {/* Wallet Selector */}
          <div>
            <label className="text-xs text-ink-muted block mb-1.5 flex items-center gap-1">
              <Wallet size={12} /> Select Sender Wallet (Deducted from)
            </label>
            <div className="relative">
              <select
                disabled={!p2pEnabled}
                className="input-field w-full appearance-none pr-8 disabled:opacity-50"
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
              >
                {wallets.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label} — ${w.balance.toLocaleString()}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>
            {selectedWalletInfo && (
              <p className="text-xs text-neon-cyan mt-1">
                Available: <span className="font-bold">${selectedWalletInfo.balance.toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Receiver Wallet Selector */}
          <div>
            <label className="text-xs text-ink-muted block mb-1.5 flex items-center gap-1">
              <Wallet size={12} /> Select Receiver Wallet (Credited to)
            </label>
            <div className="relative">
              <select
                disabled={!p2pEnabled}
                className="input-field w-full appearance-none pr-8 disabled:opacity-50"
                value={receiverWallet}
                onChange={(e) => setReceiverWallet(e.target.value)}
              >
                {wallets.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>
          </div>

          {/* Receiver ID */}
          <div>
            <label className="text-xs text-ink-muted block mb-1.5">Receiver Member ID</label>
            <input
              disabled={!p2pEnabled}
              className="input-field disabled:opacity-50"
              placeholder="e.g. NV123456"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
            />
            {receiverName && (
              <p className="text-xs text-neon-green mt-1 font-medium flex items-center gap-1">
                ✓ Receiver: <span className="font-bold">{receiverName}</span>
              </p>
            )}
            {receiverId.length >= 5 && !receiverName && (
              <p className="text-xs text-ink-muted mt-1">Looking up member...</p>
            )}
          </div>

          <div>
            <label className="text-xs text-ink-muted block mb-1.5">Amount ($)</label>
            <input disabled={!p2pEnabled} className="input-field disabled:opacity-50" type="number" placeholder="Amount to send" value={amount}
              onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" />
          </div>

          <div>
            <label className="text-xs text-ink-muted block mb-1.5">Remarks (optional)</label>
            <input disabled={!p2pEnabled} className="input-field disabled:opacity-50" placeholder="Add a note..." value={remarks}
              onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <PasswordInput placeholder="Access Key" value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)} />

          <button disabled={busy || !receiverName || !p2pEnabled} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            <Send size={15} /> {!p2pEnabled ? "P2P Transfers Disabled" : busy ? "Sending..." : "Transfer Funds"}
          </button>
          {!receiverName && receiverId.length >= 5 && p2pEnabled && (
            <p className="text-xs text-neon-magenta text-center">Please wait for receiver verification</p>
          )}
        </form>

        {/* Transfer Info Card */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-semibold">Wallet Balances</h2>
          <div className="space-y-3">
            {wallets.map((w) => (
              <div key={w.key} className={`flex items-center justify-between p-3 rounded-xl border transition ${
                selectedWallet === w.key ? "border-neon-cyan/40 bg-neon-cyan/5" : "border-white/5 bg-white/3"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedWallet === w.key ? "bg-neon-cyan" : "bg-white/20"}`} />
                  <span className="text-sm">{w.label}</span>
                </div>
                <span className={`font-bold text-sm ${selectedWallet === w.key ? "text-neon-cyan" : "text-ink"}`}>
                  ${w.balance.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-neon-violet/10 border border-neon-violet/20 rounded-xl p-4 text-xs text-ink-muted leading-relaxed">
            <p className="font-semibold text-white mb-1">Transfer Rules</p>
            <ul className="space-y-1">
              <li>• Funds are deducted from your selected wallet instantly</li>
              <li>• Receiver gets credited to the selected receiver wallet</li>
              <li>• Access Key is required to authorize each transfer</li>
              <li>• All transfers are final and cannot be reversed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reports tab selection header */}
      <div className="flex gap-4 border-b border-white/10 mb-4 pb-2">
        <button
          onClick={() => setActiveTab("sent")}
          className={`font-display font-semibold text-sm pb-1.5 border-b-2 transition-all ${
            activeTab === "sent" ? "border-neon-cyan text-neon-cyan" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Transfer Report (Sent History)
        </button>
        <button
          onClick={() => setActiveTab("received")}
          className={`font-display font-semibold text-sm pb-1.5 border-b-2 transition-all ${
            activeTab === "received" ? "border-neon-cyan text-neon-cyan" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Received Report (Received History)
        </button>
      </div>

      {/* Transfer Reports */}
      <div className="glass-card p-5">
        {activeTab === "sent" ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-neon-violet" />
              <h2 className="font-display font-semibold">Sent Transfers</h2>
            </div>
            {history.filter((tx) => tx.type === "p2p_transfer_out").length === 0 ? (
              <p className="text-sm text-ink-muted py-8 text-center">No sent P2P transfers recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-muted border-b border-white/10 text-xs">
                      <th className="py-2 pr-4">Transaction ID</th>
                      <th className="py-2 pr-4">Receiver ID</th>
                      <th className="py-2 pr-4">Receiver Name</th>
                      <th className="py-2 pr-4">Amount (USD)</th>
                      <th className="py-2 pr-4">Date & Time</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .filter((tx) => tx.type === "p2p_transfer_out")
                      .map((tx) => {
                        const statusLabel =
                          tx.status === "completed"
                            ? "Success"
                            : tx.status === "pending"
                            ? "Pending"
                            : "Failed";
                        return (
                          <tr key={tx._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                            <td className="py-3 pr-4 font-mono text-xs text-ink-muted">
                              {tx._id.slice(-8).toUpperCase()}
                            </td>
                            <td className="py-3 pr-4 text-xs font-semibold text-white">
                              {tx.receiverMemberId || "—"}
                            </td>
                            <td className="py-3 pr-4 text-xs">
                              {tx.receiverName || "—"}
                            </td>
                            <td className="py-3 pr-4 font-bold text-neon-magenta">
                              -${tx.amount.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 text-xs text-ink-muted">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                statusLabel === "Success"
                                  ? "bg-neon-green/15 text-neon-green"
                                  : statusLabel === "Pending"
                                  ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-neon-magenta/15 text-neon-magenta"
                              }`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setShareTarget(tx)}
                                className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-ink-muted hover:text-neon-cyan transition flex items-center gap-1 ml-auto"
                              >
                                <Share2 size={11} /> Share
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-neon-green" />
              <h2 className="font-display font-semibold">Received Transfers</h2>
            </div>
            {history.filter((tx) => tx.type === "p2p_transfer_in").length === 0 ? (
              <p className="text-sm text-ink-muted py-8 text-center">No received P2P transfers recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-muted border-b border-white/10 text-xs">
                      <th className="py-2 pr-4">Sender ID</th>
                      <th className="py-2 pr-4">Sender Name</th>
                      <th className="py-2 pr-4">Amount (USD)</th>
                      <th className="py-2 pr-4">Date & Time</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .filter((tx) => tx.type === "p2p_transfer_in")
                      .map((tx) => {
                        const statusLabel =
                          tx.status === "completed"
                            ? "Success"
                            : tx.status === "pending"
                            ? "Pending"
                            : "Failed";
                        return (
                          <tr key={tx._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                            <td className="py-3 pr-4 text-xs font-semibold text-white">
                              {tx.senderMemberId || "—"}
                            </td>
                            <td className="py-3 pr-4 text-xs">
                              {tx.senderName || "—"}
                            </td>
                            <td className="py-3 pr-4 font-bold text-neon-green">
                              +${tx.amount.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 text-xs text-ink-muted">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                statusLabel === "Success"
                                  ? "bg-neon-green/15 text-neon-green"
                                  : statusLabel === "Pending"
                                  ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-neon-magenta/15 text-neon-magenta"
                              }`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setShareTarget(tx)}
                                className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-ink-muted hover:text-neon-cyan transition flex items-center gap-1 ml-auto"
                              >
                                <Share2 size={11} /> Share
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {shareTarget && (
        <ShareModal tx={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </DashboardShell>
  );
}
