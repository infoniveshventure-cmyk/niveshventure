"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import { QRCodeCanvas } from "qrcode.react";
import FileUploadField from "@/components/FileUploadField";
import toast from "react-hot-toast";
import TransactionHistory, { TxRecord } from "@/components/TransactionHistory";
import { useAuth } from "@/lib/AuthContext";

export default function DepositPage() {
  const { profile } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [paymentQrUrl, setPaymentQrUrl] = useState("");
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [txnHash, setTxnHash] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  function load() {
    fetch("/api/deposit", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setDeposits(d.deposits || []);
      setWalletAddress(d.walletAddress || "");
      setPaymentQrUrl(d.paymentQrUrl || "");
      setBankDetails(d.bankDetails || null);
    });
    fetch("/api/transactions?type=deposit", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTxHistory(d.transactions || []))
      .finally(() => setTxLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!txnHash) { toast.error("Enter Transaction ID / Hash"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnHash, paymentSlipUrl: slipUrl, amount: Number(amount) || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Deposit submitted — pending admin verification");
      setTxnHash(""); setSlipUrl(""); setAmount("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="font-display text-2xl font-bold mb-6">Deposit Fund</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 text-center">
          <h2 className="font-display font-semibold mb-3">Send USDT (BEP-20)</h2>
          {paymentQrUrl ? (
            <Image src={paymentQrUrl} alt="Payment QR" width={160} height={160} unoptimized className="w-40 h-40 mx-auto rounded-2xl mb-3 border border-white/10" />
          ) : walletAddress ? (
            <div className="p-4 bg-white rounded-2xl inline-block mb-3">
              <QRCodeCanvas value={walletAddress} size={160} />
            </div>
          ) : null}
          {walletAddress ? (
            <p className="text-xs text-ink-muted break-all bg-base-soft rounded-xl p-3">{walletAddress}</p>
          ) : (
            <p className="text-sm text-ink-muted py-4">Deposit address not configured yet — contact support.</p>
          )}

          {bankDetails?.accountNumber && (
            <div className="mt-4 bg-base-soft rounded-xl p-3 text-left text-xs space-y-1">
              <p className="text-ink-muted mb-1">Or bank transfer (USD):</p>
              <p>Bank: <span className="text-ink">{bankDetails.bankName}</span></p>
              <p>Account: <span className="text-ink">{bankDetails.accountNumber}</span></p>
              <p>IFSC: <span className="text-ink">{bankDetails.ifsc}</span></p>
              <p>Holder: <span className="text-ink">{bankDetails.accountHolder}</span></p>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="glass-card p-6 space-y-3">
          <h2 className="font-display font-semibold mb-1">Confirm Your Deposit</h2>
          <input className="input-field" placeholder="Amount sent (USDT)" type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
          <input className="input-field" placeholder="Transaction ID / Hash" value={txnHash}
            onChange={(e) => setTxnHash(e.target.value)} />
          <FileUploadField label="Payment Screenshot" value={slipUrl} onChange={setSlipUrl} />
          <button disabled={busy} className="btn-primary w-full">{busy ? "Submitting..." : "Submit for Verification"}</button>
        </form>
      </div>

      {/* Deposit Submissions */}
      <div className="glass-card p-5 mt-6">
        <h2 className="font-display font-semibold mb-4">Deposit Submissions</h2>
        {!deposits.length ? (
          <p className="text-sm text-ink-muted py-8 text-center">No deposits submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-white/10 text-xs">
                  <th className="py-2 pr-4">Transaction Hash</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d._id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-ink-muted">{d.txnHash}</td>
                    <td className="py-2 pr-4">{d.amount ? `$${d.amount}` : "—"}</td>
                    <td className="py-2 pr-4 text-ink-muted text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        d.status === "verified" ? "bg-neon-green/15 text-neon-green" :
                        d.status === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-neon-magenta/15 text-neon-magenta"
                      }`}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Transaction History */}
      <div className="mt-6">
        <TransactionHistory
          title="Deposit Transaction History"
          transactions={txHistory}
          loading={txLoading}
          currentUserName={profile?.fullName || ""}
          emptyMessage="No deposit transactions yet."
        />
      </div>
    </DashboardShell>
  );
}
