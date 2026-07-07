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
  ArrowDownRight, 
  ArrowUpRight,
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
  const { refreshProfile } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("main");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  
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
  };

  useEffect(() => {
    loadData();
  }, [activeFilters]);

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
    // Sort investments oldest to newest
    const sorted = [...investments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Track running balance starting point for each wallet
    // Since we only know the CURRENT balance from wallets state, we can back-calculate
    // or calculate it relative to the current state.
    // An easier, reliable approach is to compute the running offset chronologically
    const walletOffsets: Record<string, number> = {};
    
    // First, find current balances
    const currentBalances: Record<string, number> = {};
    wallets.forEach(w => {
      currentBalances[w.key] = w.balance;
    });

    // Back-calculate starting balance before these investments:
    // startingBalance = currentBalance + sumOfAllInvestments (since they were debited)
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

    // Reverse back to newest first for UI display
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

          <button 
            type="submit" 
            disabled={busy || !amount || Number(amount) < 100}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Processing..." : "Invest Now"}
          </button>
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
    </DashboardShell>
  );
}
