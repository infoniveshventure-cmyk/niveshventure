"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { Search, RefreshCw, Send, ShieldAlert } from "lucide-react";

export default function AdminMultiWalletPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Adjustment form
  const [walletType, setWalletType] = useState("main");
  const [actionType, setActionType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(search)}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.members || []);
      }
    } catch {
      toast.error("Failed to load user lists");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const selectUser = async (user: any) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`/api/admin/members/${user.memberId}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.walletHistory || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return toast.error("Please select a user");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (!remarks.trim()) return toast.error("Remarks are required");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/members/${selectedUser.memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wallet_adjust",
          walletType,
          direction: actionType,
          amount: Number(amount),
          adminRemarks: remarks.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Wallet balance adjusted successfully!");
        setAmount("");
        setRemarks("");
        selectUser(selectedUser);
        fetchUsers();
      } else {
        toast.error(data.error || "Adjustment failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Multi-Wallet Management System</h1>
          <p className="text-sm text-ink-muted mt-1">Centralized admin credit/debit adjustments for all wallet balances.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Search List */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-white">Find Member</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-ink-muted" size={16} />
            <input
              type="text"
              placeholder="Search Member ID, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
              className="input-field pl-10 text-sm py-2"
            />
          </div>
          {loading ? (
            <p className="text-xs text-ink-muted">Searching users...</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.memberId}
                  onClick={() => selectUser(u)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedUser?.memberId === u.memberId
                      ? "border-neon-cyan bg-neon-cyan/5 text-white"
                      : "border-white/5 bg-white/5 text-ink-muted hover:bg-white/10"
                  }`}
                >
                  <p className="text-xs font-semibold text-white">{u.fullName}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{u.memberId} · {u.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Adjust balance panel */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-white flex items-center gap-2">
            <ShieldAlert size={18} className="text-neon-cyan" />
            Wallet Adjustment Controller
          </h2>
          {selectedUser ? (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-xs space-y-2">
                <p className="font-semibold text-white">Balances for {selectedUser.fullName}:</p>
                <div className="flex justify-between">
                  <span>Main Wallet:</span>
                  <span className="text-white font-mono">${selectedUser.walletBalance || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Booster Wallet:</span>
                  <span className="text-white font-mono">${selectedUser.boosterWalletBalance || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nivesh Wallet:</span>
                  <span className="text-white font-mono">${selectedUser.nivshWalletBalance || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>USDT Wallet:</span>
                  <span className="text-white font-mono">${selectedUser.usdtWalletBalance || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-ink-muted mb-1 font-semibold">Select Target Wallet</label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="input-field w-full text-xs py-2 bg-black"
                >
                  <option value="main">Main Wallet</option>
                  <option value="booster">Booster Wallet</option>
                  <option value="nivesh">Nivesh Wallet</option>
                  <option value="usdt">USDT Wallet (BEP-20)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-ink-muted mb-1 font-semibold">Action Direction</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType("credit")}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                      actionType === "credit"
                        ? "bg-neon-green/15 border-neon-green text-neon-green"
                        : "border-white/10 text-ink-muted"
                    }`}
                  >
                    + Credit Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType("debit")}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                      actionType === "debit"
                        ? "bg-neon-magenta/15 border-neon-magenta text-neon-magenta"
                        : "border-white/10 text-ink-muted"
                    }`}
                  >
                    - Debit Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-ink-muted mb-1 font-semibold">Adjustment Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field w-full text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs text-ink-muted mb-1 font-semibold">Admin Remarks / Audit Reason</label>
                <textarea
                  placeholder="Mandatory audit remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Send size={14} />
                {submitting ? "Applying..." : "Submit Adjustments"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-ink-muted text-center py-12">Select a member to modify wallet states.</p>
          )}
        </div>

        {/* Audit trail */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-white">Wallet Audit Trail</h2>
          {selectedUser ? (
            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-12">No adjustments on record.</p>
              ) : (
                history.map((h: any) => (
                  <div key={h._id} className="p-3 border border-white/5 bg-white/5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-white">{h.transactionId}</span>
                      <span className={h.type === "credit" ? "text-neon-green font-bold" : "text-neon-magenta font-bold"}>
                        {h.type === "credit" ? "+" : "-"}${h.amount}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-muted">Wallet: <span className="capitalize text-white">{h.walletType}</span></p>
                    <p className="text-[10px] text-ink-muted">{h.adminRemarks}</p>
                    <p className="text-[9px] text-ink-muted">{new Date(h.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-muted text-center py-12">Select a user to view history.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
