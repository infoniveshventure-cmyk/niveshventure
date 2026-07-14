"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { X } from "lucide-react";

export default function AdminDepositsPage() {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const statusQuery = tab === "pending" ? "pending" : "all";
    const res = await fetch(`/api/admin/deposits?status=${statusQuery}`, { cache: "no-store" });
    if (res.ok) setDeposits((await res.json()).deposits || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(depositId: string, action: "verify" | "reject", amount?: number) {
    const res = await fetch("/api/admin/deposits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositId, action, amount }),
    });
    if (res.ok) { toast.success(`Deposit ${action}ed`); load(); } else toast.error("Failed");
  }

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Deposit Management</h1>
          <p className="text-sm text-ink-muted mt-1">Verify manual deposits and view deposit logs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            tab === "pending"
              ? "border-neon-magenta text-neon-magenta"
              : "border-transparent text-ink-muted hover:text-white"
          }`}
        >
          Pending Verifications
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            tab === "history"
              ? "border-neon-magenta text-neon-magenta"
              : "border-transparent text-ink-muted hover:text-white"
          }`}
        >
          Deposit History
        </button>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : !deposits.length ? (
          <p className="text-sm text-ink-muted py-8 text-center">
            {tab === "pending" ? "No pending deposits." : "No deposits found in history."}
          </p>
        ) : (
          <div className="space-y-3">
            {deposits.map((d) => (
              <div key={d._id} className="bg-base-soft rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {d.paymentSlipUrl && (
                    <div className="relative group shrink-0">
                      <a href={d.paymentSlipUrl} target="_blank">
                        <Image src={d.paymentSlipUrl} alt="Payment proof" width={64} height={64} unoptimized className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                      </a>
                      {d.status === "pending" && (
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this screenshot from the database?")) {
                              const res = await fetch(`/api/admin/deposits?depositId=${d._id}`, { method: "DELETE" });
                              if (res.ok) {
                                toast.success("Screenshot deleted from database");
                                load();
                              } else {
                                toast.error("Failed to delete screenshot");
                              }
                            }
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-neon-magenta text-white rounded-full p-1 shadow hover:bg-red-600 transition flex items-center justify-center"
                          title="Delete screenshot from database"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-neon-cyan">Amount: {d.amount?.toLocaleString() || "0"} USDT</p>
                    <p className="text-sm font-medium mt-1">
                      User: <span className="text-white font-bold">{d.userName}</span> ({d.memberId})
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">Txn ID / Hash: {d.txnHash}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Date & Time: {new Date(d.createdAt).toLocaleString()}
                    </p>
                    {d.status !== "pending" && (
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${
                        d.status === "verified"
                          ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                          : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                      }`}>
                        {d.status.toUpperCase()}
                      </span>
                    )}
                    {d.paymentSlipUrl && (
                      <div className="flex gap-2 items-center mt-2">
                        <a href={d.paymentSlipUrl} target="_blank" className="text-xs text-neon-cyan underline">View full screenshot</a>
                      </div>
                    )}
                  </div>
                </div>
                {d.status === "pending" && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Amount to credit"
                      className="input-field text-xs py-1.5 w-36"
                      id={`amt-${d._id}`}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(`amt-${d._id}`) as HTMLInputElement;
                        act(d._id, "verify", Number(el.value) || undefined);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-neon-green/15 text-neon-green"
                    >Verify</button>
                    <button onClick={() => act(d._id, "reject")} className="text-xs px-3 py-1.5 rounded-lg bg-neon-magenta/15 text-neon-magenta">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
