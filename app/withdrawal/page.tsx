"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import toast from "react-hot-toast";
import PasswordInput from "@/components/ui/PasswordInput";
import TransactionHistory, { TxRecord } from "@/components/TransactionHistory";
import { useAuth } from "@/lib/AuthContext";

export default function WithdrawalPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<"USDT" | "INR">("USDT");
  const [kind, setKind] = useState<"earning" | "capital">("earning");
  const [amount, setAmount] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [bank, setBank] = useState({ bankName: "", accountNumber: "", ifsc: "", accountHolder: "" });
  const [usdtAddress, setUsdtAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [minWithdrawal, setMinWithdrawal] = useState(10);
  const [feeRate, setFeeRate] = useState(3);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  function loadHistory() {
    fetch("/api/withdrawal", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.withdrawals || []);
        if (d.minWithdrawal !== undefined) setMinWithdrawal(d.minWithdrawal);
        if (d.feeRate !== undefined) setFeeRate(d.feeRate);
      });
    fetch("/api/transactions?type=withdrawal", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTxHistory(d.transactions || []))
      .finally(() => setTxLoading(false));
  }

  useEffect(() => {
    loadHistory();
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setWithdrawalsEnabled(d.settings.withdrawalsEnabled !== false);
        }
      })
      .catch(() => { })
      .finally(() => setCheckingStatus(false));
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const charge = Number((numAmount * (feeRate / 100)).toFixed(2));
  const net = Number((numAmount - charge).toFixed(2));
  const filteredHistory = history.filter((w) => (w.withdrawalKind || "earning") === kind);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawalsEnabled) {
      toast.error("Withdrawals are temporarily disabled.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          mode,
          accessKey,
          bankDetails: mode === "INR" ? bank : undefined,
          usdtAddress: mode === "USDT" ? usdtAddress : undefined,
          withdrawalKind: kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Withdrawal request submitted");
      setAmount(""); setAccessKey(""); setUsdtAddress("");
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="font-display text-2xl font-bold mb-6">Withdrawal</h1>

      {!checkingStatus && !withdrawalsEnabled ? (
        <div className="glass-card border-neon-magenta/40 p-6 text-neon-magenta text-center text-sm font-semibold max-w-xl mx-auto my-8">
          Withdrawals are temporarily unavailable due to technical maintenance. Please try again later.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-3">
            <h2 className="font-display font-semibold mb-1">Request Withdrawal</h2>
            <p className="text-xs text-ink-muted mb-3">Minimum ${minWithdrawal} for earnings. {feeRate}% processing charge applies.</p>

            <div className="flex gap-3">
              {(["earning", "capital"] as const).map((k) => {
                const totalEarnings =
                  (profile?.totalReferralIncome ?? 0) +
                  (profile?.totalMatchingIncome ?? 0) +
                  (profile?.totalReturnsIncome ?? 0) +
                  (profile?.totalLevelIncome ?? 0) +
                  (profile?.totalRewardIncome ?? 0);
                return (
                  <button type="button" key={k} onClick={() => setKind(k)}
                    className={`flex-1 py-2 rounded-xl text-sm border capitalize transition ${kind === k ? "border-neon-violet bg-neon-violet/10 text-neon-violet" : "border-white/10 text-ink-muted"
                      }`}>
                    {k === "earning"
                      ? `Total Earning: $${totalEarnings.toLocaleString()}`
                      : `Total Capital: $${(profile?.totalInvestment ?? 0).toLocaleString()}`}
                  </button>
                );
              })}
            </div>
            {kind === "capital" && (
              <p className="text-xs text-neon-magenta">Capital (Nivesh) withdrawable only after 11-month lock-in completes.</p>
            )}

            <div className="flex gap-3">
              {(["USDT", "INR"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition ${mode === m ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-white/10 text-ink-muted"
                    }`}>{m}</button>
              ))}
            </div>

            <input className="input-field" type="number" placeholder="Withdrawal amount ($)" value={amount}
              onChange={(e) => setAmount(e.target.value)} />

            {mode === "USDT" ? (
              <input className="input-field" placeholder="USDT wallet address (BEP-20)" value={usdtAddress}
                onChange={(e) => setUsdtAddress(e.target.value)} />
            ) : (
              <>
                <input className="input-field" placeholder="Bank name" value={bank.bankName}
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
                <input className="input-field" placeholder="Account number" value={bank.accountNumber}
                  onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} />
                <input className="input-field" placeholder="IFSC code" value={bank.ifsc}
                  onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} />
                <input className="input-field" placeholder="Account holder name" value={bank.accountHolder}
                  onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })} />
              </>
            )}

            <PasswordInput placeholder="Access Key" value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)} />

            {numAmount > 0 && (
              <div className="text-xs text-ink-muted bg-base-soft rounded-xl p-3 space-y-1">
                <div className="flex justify-between"><span>Processing charge ({feeRate}%)</span><span>${charge}</span></div>
                <div className="flex justify-between text-neon-green font-medium"><span>Net payable</span><span>${net}</span></div>
                {mode === "INR" && (
                  <div className="flex justify-between text-neon-cyan font-bold pt-1 border-t border-white/5 mt-1">
                    <span>Estimated INR Payout (1 USD = ₹90)</span>
                    <span>₹{(net * 90).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <button disabled={submitting || !withdrawalsEnabled} className="btn-primary w-full mt-2 disabled:opacity-50">
              {!withdrawalsEnabled ? "Withdrawals Disabled" : submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>

          <div className="glass-card p-6">
            <h2 className="font-display font-semibold mb-4 capitalize">
              Withdrawal Requests ({kind})
            </h2>
            {!filteredHistory.length ? (
              <p className="text-sm text-ink-muted py-8 text-center">No {kind} withdrawal requests yet.</p>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((w) => (
                  <div key={w._id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{w.mode} · ${w.amount}</p>
                      <p className="text-xs text-ink-muted">{new Date(w.createdAt).toLocaleDateString()}</p>
                      {w.usdtAddress && (
                        <p className="text-[11px] text-ink-muted mt-0.5">Address: {w.usdtAddress}</p>
                      )}
                      {w.bankDetails?.accountNumber && (
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Bank: {w.bankDetails.bankName} ({w.bankDetails.accountNumber})
                        </p>
                      )}
                      {w.adminNote && (
                        <p className="text-[11px] text-neon-magenta mt-0.5">Note: {w.adminNote}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === "completed" ? "bg-neon-green/15 text-neon-green" :
                      w.status === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-neon-magenta/15 text-neon-magenta"
                      }`}>{w.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Transaction History */}
      <div className="mt-6">
        <TransactionHistory
          title="Withdrawal Transaction History"
          transactions={txHistory}
          loading={txLoading}
          currentUserName={profile?.fullName || ""}
          emptyMessage="No withdrawal transactions yet."
        />
      </div>
    </DashboardShell>
  );
}
