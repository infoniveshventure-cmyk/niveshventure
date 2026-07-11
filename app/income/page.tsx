"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { 
  TrendingUp, 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Calendar, 
  RefreshCw, 
  Filter, 
  Search, 
  Download,
  Award,
  Zap,
  DollarSign,
  Gift,
  Percent,
  Layers,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";

interface IncomeTx {
  _id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  status: string;
  note: string;
  description: string;
  createdAt: string;
  balanceAfter: number;
}

const WALLET_MAP: Record<string, { label: string; icon: any; color: string }> = {
  referral_income: { label: "Referral Income", icon: Gift, color: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
  matching_income: { label: "Matching Income", icon: Layers, color: "text-neon-violet bg-neon-violet/10 border-neon-violet/20" },
  reward_income: { label: "Rank Rewards", icon: Award, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  booster_income: { label: "Booster Income", icon: Zap, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  returns_income: { label: "Returns Income", icon: Percent, color: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  level_income: { label: "Returns Level Income", icon: TrendingUp, color: "text-neon-magenta bg-neon-magenta/10 border-neon-magenta/20" },
};

export default function MyEarningsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [txHistory, setTxHistory] = useState<IncomeTx[]>([]);

  // Filter states
  const [selectedWallet, setSelectedWallet] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [txType, setTxType] = useState("all");
  const [searchTxId, setSearchTxId] = useState("");

  const [levelBreakdown, setLevelBreakdown] = useState<any[]>([]);

  // Active filters applied on submit
  const [activeFilters, setActiveFilters] = useState({
    wallet: "all",
    from: "",
    to: "",
    type: "all",
    txId: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, levelRes] = await Promise.all([
        fetch("/api/income", { cache: "no-store" }),
        fetch("/api/income/level", { cache: "no-store" }),
      ]);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setTxHistory(d.transactions || []);
      } else {
        toast.error("Failed to load earnings data");
      }
      if (levelRes.ok) {
        const ld = await levelRes.json();
        setLevelBreakdown(ld.list || []);
      }
    } catch {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters({
      wallet: selectedWallet,
      from: fromDate,
      to: toDate,
      type: txType,
      txId: searchTxId.trim(),
    });
  };

  const handleReset = () => {
    setSelectedWallet("all");
    setFromDate("");
    setToDate("");
    setTxType("all");
    setSearchTxId("");
    setActiveFilters({
      wallet: "all",
      from: "",
      to: "",
      type: "all",
      txId: "",
    });
  };

  // Filtered transactions computed locally
  const filteredTxs = useMemo(() => {
    return txHistory.filter((tx) => {
      // Wallet filter
      if (activeFilters.wallet !== "all" && tx.type !== activeFilters.wallet) {
        return false;
      }
      // Date range filter
      if (activeFilters.from && new Date(tx.createdAt) < new Date(activeFilters.from)) {
        return false;
      }
      if (activeFilters.to) {
        const endLimit = new Date(activeFilters.to);
        endLimit.setHours(23, 59, 59, 999);
        if (new Date(tx.createdAt) > endLimit) {
          return false;
        }
      }
      // Type filter (credit/debit)
      if (activeFilters.type !== "all" && tx.direction !== activeFilters.type) {
        return false;
      }
      // Tx ID search filter
      if (activeFilters.txId && !tx._id.toLowerCase().includes(activeFilters.txId.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [txHistory, activeFilters]);

  // Click card handler
  const handleCardClick = (walletKey: string) => {
    setSelectedWallet(walletKey);
    setActiveFilters({
      wallet: walletKey,
      from: "",
      to: "",
      type: "all",
      txId: "",
    });
  };

  // CSV Export utility
  const exportToCSV = (filename = "earnings_statement.csv") => {
    if (filteredTxs.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Date & Time", "Transaction ID", "Wallet Name", "Income Type", "Credit (USD)", "Debit (USD)", "Balance After", "Description", "Status"];
    const rows = filteredTxs.map((tx) => [
      new Date(tx.createdAt).toLocaleString(),
      tx._id.toUpperCase(),
      WALLET_MAP[tx.type]?.label || tx.type,
      tx.type.replace(/_/g, " ").toUpperCase(),
      tx.direction === "credit" ? `$${tx.amount}` : "",
      tx.direction === "debit" ? `$${tx.amount}` : "",
      `$${tx.balanceAfter}`,
      tx.note || tx.description || "—",
      tx.status === "completed" ? "Success" : tx.status === "pending" ? "Pending" : "Failed"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Statement downloaded successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-neon-cyan" /> My Earnings
        </h1>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 ml-auto border border-white/10"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 border-neon-cyan/20">
          <p className="text-xs text-ink-muted flex items-center gap-1"><DollarSign size={12} /> Total Earnings</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-cyan">
            ${(data?.totalEarnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-5 border-neon-green/20">
          <p className="text-xs text-ink-muted flex items-center gap-1"><Wallet size={12} /> Total Available Balance</p>
          <p className="font-display text-2xl font-bold mt-1 text-neon-green">
            ${(data?.availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-5 border-white/5">
          <p className="text-xs text-ink-muted flex items-center gap-1"><ArrowDownRight size={12} /> Total Credit</p>
          <p className="font-display text-2xl font-bold mt-1 text-white">
            ${(data?.totalCredit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-5 border-white/5">
          <p className="text-xs text-ink-muted flex items-center gap-1"><ArrowUpRight size={12} /> Total Debit</p>
          <p className="font-display text-2xl font-bold mt-1 text-white/60">
            ${(data?.totalDebit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Wallet Cards Grid */}
      <h2 className="font-display font-semibold mb-4 text-sm text-white/80">Select Earning Wallet to Filter History</h2>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {Object.entries(WALLET_MAP).map(([key, w]) => {
          const balKey = key.split("_")[0];
          const rawBal = data?.balances?.[balKey] ?? 0;
          const isSelected = activeFilters.wallet === key;
          const Icon = w.icon;
          return (
            <button
              key={key}
              onClick={() => handleCardClick(key)}
              className={`glass-card p-4 text-left transition-all hover:scale-[1.02] border duration-200 cursor-pointer ${
                isSelected ? "ring-2 ring-neon-cyan border-neon-cyan/50 bg-white/5" : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${w.color}`}>
                <Icon size={16} />
              </div>
              <p className="text-[10px] text-ink-muted font-medium truncate">{w.label}</p>
              <p className="font-display text-sm font-bold mt-1 text-white">
                ${rawBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters form */}
      <form onSubmit={handleSearch} className="glass-card p-5 mb-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Filter size={14} className="text-neon-cyan" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] text-ink-muted block mb-1">Select Wallet</label>
            <select
              className="input-field py-1.5 text-xs"
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
            >
              <option value="all">All Wallets</option>
              {Object.entries(WALLET_MAP).map(([k, w]) => (
                <option key={k} value={k}>{w.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-ink-muted block mb-1">From Date</label>
            <input
              type="date"
              className="input-field py-1 text-xs"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-ink-muted block mb-1">To Date</label>
            <input
              type="date"
              className="input-field py-1 text-xs"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-ink-muted block mb-1">Transaction Type</label>
            <select
              className="input-field py-1.5 text-xs"
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-ink-muted block mb-1">Transaction ID Search</label>
            <input
              type="text"
              placeholder="Search TX ID..."
              className="input-field py-1 text-xs"
              value={searchTxId}
              onChange={(e) => setSearchTxId(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost py-1.5 px-4 text-xs"
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn-primary py-1.5 px-5 text-xs flex items-center gap-1"
          >
            <Search size={12} /> Search
          </button>
        </div>
      </form>

      {/* Actions and Table */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-3 border-b border-white/5">
          <h3 className="font-display font-semibold text-sm">Income History Table</h3>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              onClick={() => exportToCSV("earnings_statement.csv")}
              className="btn-ghost py-1 px-3 text-[11px] border border-white/10 flex items-center gap-1 text-ink-muted hover:text-white"
            >
              <Download size={11} /> Download Statement (CSV)
            </button>
            <button
              onClick={() => exportToCSV("earnings_excel.csv")}
              className="btn-ghost py-1 px-3 text-[11px] border border-white/10 flex items-center gap-1 text-ink-muted hover:text-white"
            >
              <FileText size={11} /> Export Excel
            </button>
            <button
              onClick={handlePrint}
              className="btn-ghost py-1 px-3 text-[11px] border border-white/10 flex items-center gap-1 text-ink-muted hover:text-white"
            >
              <FileText size={11} /> Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted py-8 text-center">Loading transactions...</p>
        ) : filteredTxs.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No income records found matching the filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 pr-3">Date & Time</th>
                  <th className="py-2.5 pr-3">Transaction ID</th>
                  <th className="py-2.5 pr-3">Wallet Name</th>
                  <th className="py-2.5 pr-3">Income Type</th>
                  <th className="py-2.5 pr-3">Credit (USD)</th>
                  <th className="py-2.5 pr-3">Debit (USD)</th>
                  <th className="py-2.5 pr-3">Balance After</th>
                  <th className="py-2.5 pr-3">Description / Remark</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => {
                  const walletInfo = WALLET_MAP[tx.type];
                  return (
                    <tr key={tx._id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-3 text-ink-muted whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[10px] text-ink-muted">
                        {tx._id.toUpperCase()}
                      </td>
                      <td className="py-3 pr-3 font-medium whitespace-nowrap">
                        {walletInfo?.label || tx.type}
                      </td>
                      <td className="py-3 pr-3 font-bold text-[10px] text-neon-cyan whitespace-nowrap">
                        {tx.type.replace(/_/g, " ").toUpperCase()}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-neon-green">
                        {tx.direction === "credit" ? `+$${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-neon-magenta">
                        {tx.direction === "debit" ? `-$${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                      </td>
                      <td className="py-3 pr-3 font-bold text-white">
                        ${tx.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-3 text-ink-muted max-w-[200px] truncate" title={tx.note || tx.description}>
                        {tx.note || tx.description || "—"}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          tx.status === "completed" 
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                            : tx.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20"
                        }`}>
                          {tx.status === "completed" ? "Success" : tx.status === "pending" ? "Pending" : "Failed"}
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

      {levelBreakdown.length > 0 && (
        <div className="glass-card p-5 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-3 border-b border-white/5">
            <h3 className="font-display font-semibold text-sm">Returns Level Income - Downline Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 pr-3">Date</th>
                  <th className="py-2.5 pr-3">Downline User</th>
                  <th className="py-2.5 pr-3">Level</th>
                  <th className="py-2.5 pr-3">Downline Investment</th>
                  <th className="py-2.5 pr-3">Level Pct</th>
                  <th className="py-2.5 pr-3">Income Amount</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {levelBreakdown.map((row, idx) => (
                  <tr key={row._id || idx} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-3 text-ink-muted whitespace-nowrap">
                      {row.calculationDate || new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-white">
                      {row.downlineMemberId}
                    </td>
                    <td className="py-3 pr-3 text-neon-cyan font-semibold">
                      Level {row.level}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-ink-muted">
                      ${row.investmentAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 pr-3 text-yellow-400 font-mono">
                      {row.percentage}%
                    </td>
                    <td className="py-3 pr-3 font-bold text-neon-green">
                      +${row.calculatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        row.status === "Credited" 
                          ? "bg-neon-green/10 text-neon-green border border-neon-green/20" 
                          : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
