"use client";

import { useState } from "react";
import { Share2, Copy, Clock, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

export type TxRecord = {
  _id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  currency: string;
  walletType?: string;
  status: string;
  note?: string;
  description?: string;
  senderMemberId?: string;
  senderName?: string;
  receiverMemberId?: string;
  receiverName?: string;
  createdAt: string;
  memberId: string;
};

const WALLET_LABELS: Record<string, string> = {
  main: "Main Wallet",
  booster: "Booster Wallet",
  nivesh: "Nivesh Wallet",
  usdt: "USDT Wallet",
};

function buildShareText(tx: TxRecord, currentUserName: string) {
  const lines = [
    `📄 Transaction Receipt`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Transaction ID: ${tx._id}`,
    `Type: ${tx.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
    `Direction: ${tx.direction === "credit" ? "Credit (+)" : "Debit (-)"}`,
    `Amount: $${tx.amount.toLocaleString()}`,
    `Wallet: ${WALLET_LABELS[tx.walletType || "main"] || tx.walletType || "Main Wallet"}`,
    `Status: ${tx.status}`,
    `Date & Time: ${new Date(tx.createdAt).toLocaleString()}`,
  ];

  if (tx.senderName || tx.senderMemberId) {
    lines.push(`Sender: ${tx.senderName || "—"} (${tx.senderMemberId || "—"})`);
  }
  if (tx.receiverName || tx.receiverMemberId) {
    lines.push(`Receiver: ${tx.receiverName || "—"} (${tx.receiverMemberId || "—"})`);
  }
  if (tx.note) lines.push(`Note: ${tx.note}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Nivesh Ventures`);
  return lines.join("\n");
}

function ShareModal({ tx, currentUserName, onClose }: { tx: TxRecord; currentUserName: string; onClose: () => void }) {
  const shareText = buildShareText(tx, currentUserName);

  const copy = () => {
    navigator.clipboard.writeText(shareText).then(() => toast.success("Copied to clipboard!"));
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Transaction Receipt", text: shareText }); } catch {}
    } else {
      copy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Share2 size={18} className="text-neon-cyan" /> Share Transaction
        </h3>
        <pre className="bg-base-soft rounded-xl p-4 text-xs text-ink-muted whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
          {shareText}
        </pre>
        <div className="flex gap-3">
          <button onClick={share} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <Share2 size={14} /> Share
          </button>
          <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-xl border border-white/15 hover:bg-white/5 transition text-ink">
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

interface TransactionHistoryProps {
  title?: string;
  transactions: TxRecord[];
  loading?: boolean;
  currentUserName?: string;
  emptyMessage?: string;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

export default function TransactionHistory({
  title = "Transaction History",
  transactions,
  loading = false,
  currentUserName = "",
  emptyMessage = "No transactions found.",
  showLoadMore = false,
  onLoadMore,
}: TransactionHistoryProps) {
  const [shareTarget, setShareTarget] = useState<TxRecord | null>(null);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-neon-violet" />
        <h2 className="font-display font-semibold">{title}</h2>
        <span className="text-xs text-ink-muted ml-auto">{transactions.length} records</span>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted py-8 text-center animate-pulse">Loading history...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-ink-muted py-8 text-center">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-white/10 text-xs">
                <th className="py-2 pr-3">Transaction ID</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Date & Time</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Wallet</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Sender / Receiver</th>
                <th className="py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="py-3 pr-3">
                    <p className="font-mono text-xs text-ink-muted truncate max-w-[100px]" title={tx._id}>{tx._id.slice(-8).toUpperCase()}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                      tx.direction === "credit" ? "bg-neon-green/15 text-neon-green" : "bg-neon-magenta/15 text-neon-magenta"
                    }`}>
                      {tx.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-xs text-ink-muted whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className={`py-3 pr-3 font-bold ${tx.direction === "credit" ? "text-neon-green" : "text-neon-magenta"}`}>
                    {tx.direction === "credit" ? "+" : "-"}${tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 pr-3 text-xs text-ink-muted">
                    {WALLET_LABELS[tx.walletType || "main"] || "Main Wallet"}
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      tx.status === "completed" ? "bg-neon-green/10 text-neon-green" :
                      tx.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-neon-magenta/10 text-neon-magenta"
                    }`}>{tx.status}</span>
                  </td>
                  <td className="py-3 pr-3 text-xs text-ink-muted">
                    {tx.senderName && <p>From: <span className="text-ink">{tx.senderName}</span></p>}
                    {tx.receiverName && <p>To: <span className="text-ink">{tx.receiverName}</span></p>}
                    {!tx.senderName && !tx.receiverName && <span>—</span>}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLoadMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            className="text-sm text-neon-cyan hover:underline flex items-center gap-1 mx-auto"
          >
            <ChevronDown size={14} /> Load More
          </button>
        </div>
      )}

      {shareTarget && (
        <ShareModal tx={shareTarget} currentUserName={currentUserName} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
