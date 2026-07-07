"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { 
  PiggyBank, 
  Wallet, 
  Calendar, 
  Search, 
  RefreshCw, 
  Clock, 
  ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";

interface InvestmentRecord {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  walletUsed: string;
  paymentMode: string;
  balanceAfter?: number;
}

const WALLET_LABELS: Record<string, string> = {
  main: "Main Wallet",
  booster: "Booster Wallet",
  nivesh: "Nivesh Wallet",
  usdt: "USDT Wallet",
};

export default function InvestPage() {
  const { profile, refreshProfile } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("main");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);

  // Investment transactions history
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  // Invest in another account states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetInfo, setTargetInfo] = useState<{ fullName: string; totalInvestment: number; activeInvestments: any[]; memberId: string } | null>(null);
  const [targetError, setTargetError] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalWallet, setModalWallet] = useState("main");
  const [modalBusy, setModalBusy] = useState(false);
  
  // Date filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeFilters, setActiveFilters] = useState({ from: "", to: "" });

  const loadData = async () => {
    let url = "/api/nivesh?";
    if (activeFilters.from) url += `startDate=${activeFilters.from}&`;
    if (activeFilters.to) url += `endDate=${activeFilters.to}`;
    
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setInvestments(d.investments || []);
        if (d.wallets) setWallets(d.wallets);
      }
    } catch {
      toast.error("Failed to load investments");
    }

    try {
      setTxLoading(true);
      const res = await fetch("/api/transactions?type=investment", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setTxHistory(d.transactions || []);
      }
    } catch {
      console.error("Failed to load investment transactions");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilters]);

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
        const res = await fetch(`/api/user/lookup?memberId=${encodeURIComponent(targetId.trim())}&purpose=investment`);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters({ from: fromDate, to: toDate });
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setActiveFilters({ from: "", to: "" });
  };

  const selectedWalletInfo = wallets.find((w) => w.key === selectedWallet);
  const modalWalletInfo = wallets.find((w) => w.key === modalWallet);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      toast.error("Minimum investment is $100");
      return;
    }
    if (!selectedWalletInfo) {
      toast.error("Please select a wallet");
      return;
    }
    if (selectedWalletInfo.balance < numAmount) {
      toast.error(`Insufficient balance in ${selectedWalletInfo.label}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/nivesh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, walletType: selectedWallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`Successfully invested $${numAmount.toLocaleString()} using ${selectedWalletInfo.label}`);
      setAmount("");
      await refreshProfile(); // Sync dashboard balance
      await loadData(); // Reload wallets & table
    } catch (err: any) {
      toast.error(err.message || "Investment failed");
    } finally {
      setBusy(false);
    }
  }

  // Calculate chronological running balance for each wallet to show "Balance After Investment"
  const processedInvestments = useMemo(() => {
    const sorted = [...investments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const currentBalances: Record<string, number> = {};
    wallets.forEach(w => {
      currentBalances[w.key] = w.balance;
    });

    const startingBalances: Record<string, number> = {};
    wallets.forEach(w => {
      const totalDebited = sorted
        .filter(inv => inv.walletUsed === w.key)
        .reduce((sum, inv) => sum + inv.amount, 0);
      startingBalances[w.key] = currentBalances[w.key] + totalDebited;
    });

    const runningBalances = { ...startingBalances };

    const computed = sorted.map((inv) => {
      const wKey = inv.walletUsed || "main";
      runningBalances[wKey] = (runningBalances[wKey] || 0) - inv.amount;
      return {
        ...inv,
        balanceAfter: runningBalances[wKey] || 0,
      };
    });

    return computed.reverse();
  }, [investments, wallets]);

  return (
    <DashboardShell>
      <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
        <PiggyBank className="text-neon-cyan" /> Nivesh (Investment)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Do Investment Form */}
        <form onSubmit={submit} className="glass-card p-6 space-y-4 border-neon-cyan/20 h-fit">
          <h2 className="font-display font-semibold mb-1">New Investment</h2>

          {/* Wallet Selection Dropdown */}
          <div>
            <label className="text-xs text-ink-muted block mb-1.5 flex items-center gap-1">
              <Wallet size={12} className="text-neon-cyan" /> Select Wallet
            </label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-8 cursor-pointer"
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
              >
                {wallets.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label} — ${w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>
          </div>

          {/* Available Wallet Balance indicator */}
          {selectedWalletInfo && (
            <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="text-ink-muted">Available Balance:</span>
              <span className="font-bold text-neon-cyan">${selectedWalletInfo.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Investment Amount input */}
          <div>
            <label className="text-xs text-ink-muted block mb-1.5">Investment Amount ($)</label>
            <input
              className="input-field"
              type="number"
              min="100"
              step="1"
              placeholder="Min $100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[10px] text-ink-muted mt-1 leading-relaxed">
              * Minimum investment amount is $100. No maximum limit.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              type="submit" 
              disabled={busy || !amount || Number(amount) < 100}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
            >
              {busy ? "Processing..." : "Invest Now"}
            </button>
            
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 flex-1 py-2.5 rounded-xl font-display font-semibold transition-all duration-300 flex items-center justify-center gap-1 text-xs"
            >
              Invest in Another Account
            </button>
          </div>
        </form>

        {/* Search & Date Filters */}
        <div className="glass-card p-6 lg:col-span-2 space-y-4 border-white/5">
          <h2 className="font-display font-semibold mb-1 flex items-center gap-1.5">
            <Calendar size={16} className="text-neon-cyan" /> Search by Date
          </h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-[10px] text-ink-muted block mb-1">From Date</label>
              <input
                type="date"
                className="input-field text-xs py-1"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-ink-muted block mb-1">To Date</label>
              <input
                type="date"
                className="input-field text-xs py-1"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="btn-ghost py-1 px-4 text-xs flex-1"
              >
                Reset
              </button>
              <button
                type="submit"
                className="btn-primary py-1 px-4 text-xs flex-1 flex items-center justify-center gap-1"
              >
                <Search size={12} /> Search
              </button>
            </div>
          </form>

          {/* Investment History list */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm">Nivesh History</h2>
              <button 
                onClick={loadData}
                className="text-xs text-neon-cyan hover:underline flex items-center gap-1"
              >
                <RefreshCw size={11} /> Refresh
              </button>
            </div>

            {processedInvestments.length === 0 ? (
              <p className="text-xs text-ink-muted py-8 text-center border border-white/5 rounded-xl">
                No investment history found for the selected range.
              </p>
            ) : (
              <div className="overflow-x-auto border border-white/5 rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10 uppercase text-[9px] text-ink-muted">
                    <tr>
                      <th className="py-2 px-3">Transaction ID</th>
                      <th className="py-2 pr-3">Investment Amount</th>
                      <th className="py-2 pr-3">Wallet Used</th>
                      <th className="py-2 pr-3">Date & Time</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedInvestments.map((inv) => {
                      const dateObj = new Date(inv.createdAt);
                      const dateStr = dateObj.toLocaleDateString();
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const statusLabel = inv.status === "active" ? "Success" : inv.status === "pending" ? "Pending" : "Failed";

                      return (
                        <tr key={inv._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                          <td className="py-2 px-3 font-mono text-[9px] text-ink-muted">
                            {inv._id.toUpperCase()}
                          </td>
                          <td className="py-2 pr-3 font-bold text-white">
                            ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 pr-3 text-ink-muted">
                            {WALLET_LABELS[inv.walletUsed] || inv.walletUsed || "Main Wallet"}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap text-ink-muted">
                            {dateStr} <span className="text-[10px] ml-1">{timeStr}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              statusLabel === "Success" 
                                ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                                : statusLabel === "Pending"
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-ink-muted truncate max-w-[150px]" title={inv.paymentMode}>
                            {inv.paymentMode === "wallet" ? "Investment via wallet deduction" : inv.paymentMode}
                          </td>
                          <td className="py-2 pr-3 font-bold text-white">
                            ${inv.balanceAfter?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invest in Another Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <PiggyBank className="text-neon-cyan" size={18} /> Invest in Another Account
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
                  <div className="flex justify-between flex-col">
                    <span className="text-ink-muted mb-1">Investment Details:</span>
                    <span className="font-semibold text-white pl-2">
                      Total Invested: ${targetInfo.totalInvestment.toLocaleString()}
                      {targetInfo.activeInvestments && targetInfo.activeInvestments.length > 0 ? (
                        <div className="mt-1 text-[10px] text-ink-muted space-y-0.5">
                          Active packages: {targetInfo.activeInvestments.map((inv, idx) => (
                            <span key={idx} className="block">• ${inv.amount.toLocaleString()} (since {new Date(inv.createdAt).toLocaleDateString()})</span>
                          ))}
                        </div>
                      ) : (
                        <span className="block text-[10px] text-ink-muted">• No active investment packages</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Wallet Selection */}
              {wallets.length > 0 && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1.5 font-medium">Select Wallet to Pay From</label>
                  <div className="relative">
                    <select
                      className="input-field w-full appearance-none pr-8 text-sm cursor-pointer"
                      value={modalWallet}
                      onChange={(e) => setModalWallet(e.target.value)}
                    >
                      {wallets.map((w: any) => (
                        <option key={w.key} value={w.key}>
                          {w.label} (Balance: ${w.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">▼</div>
                  </div>
                </div>
              )}

              {/* Predefined selection */}
              <div>
                <label className="text-xs text-ink-muted block mb-1.5 font-medium">Predefined Packages</label>
                <div className="grid grid-cols-4 gap-2">
                  {["100", "500", "1000", "5000"].map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setModalAmount(pkg)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border ${
                        modalAmount === pkg
                          ? "border-neon-cyan bg-neon-cyan/15 text-white"
                          : "border-white/10 text-ink-muted hover:bg-white/5"
                      }`}
                    >
                      ${pkg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-xs text-ink-muted block mb-1.5 font-medium">Investment Amount ($)</label>
                <input
                  type="number"
                  placeholder="Min $100"
                  className="input-field w-full"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={modalBusy || !targetInfo || !modalAmount || Number(modalAmount) < 100 || (modalWalletInfo && modalWalletInfo.balance < Number(modalAmount))}
                onClick={async () => {
                  setModalBusy(true);
                  try {
                    const res = await fetch("/api/nivesh", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        amount: Number(modalAmount),
                        walletType: modalWallet,
                        targetMemberId: targetInfo?.memberId,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    toast.success("Investment processed successfully!");
                    setIsModalOpen(false);
                    setTargetId("");
                    setTargetInfo(null);
                    setModalAmount("");
                    loadData();
                    refreshProfile();
                  } catch (err: any) {
                    toast.error(err.message || "Investment failed");
                  } finally {
                    setModalBusy(false);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl font-display font-semibold transition-all duration-300 ${
                  modalBusy || !targetInfo || !modalAmount || Number(modalAmount) < 100 || (modalWalletInfo && modalWalletInfo.balance < Number(modalAmount))
                    ? "bg-white/5 text-ink-muted border border-white/5 cursor-not-allowed"
                    : "btn-primary shadow-neon text-white hover:scale-[1.02]"
                }`}
              >
                {modalBusy ? "Processing..." : modalWalletInfo && modalWalletInfo.balance < Number(modalAmount) ? "Insufficient Balance" : "Invest"}
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setTargetId("");
                  setTargetInfo(null);
                  setTargetError("");
                  setModalAmount("");
                }}
                className="flex-1 py-2.5 text-sm rounded-xl border border-white/10 hover:bg-white/5 text-ink-muted transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investment History Table */}
      <div className="glass-card p-6 border border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-neon-cyan" />
          <h2 className="font-display font-semibold text-lg text-white">Investment History</h2>
          <span className="text-xs text-ink-muted ml-auto">{txHistory.length} records</span>
        </div>

        {txLoading ? (
          <p className="text-sm text-ink-muted py-8 text-center animate-pulse">Loading investment history...</p>
        ) : txHistory.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No investment transactions yet.</p>
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
                  <th className="py-2 pr-3">Package/Investment Amount</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {txHistory.map((tx) => {
                  const dateObj = new Date(tx.createdAt);
                  const dateStr = dateObj.toLocaleDateString();
                  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  const payerId = tx.senderMemberId || tx.memberId;
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
