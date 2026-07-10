"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { 
  Mail, 
  Phone, 
  Calendar, 
  Layers, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Wallet,
  Edit2,
  Lock,
  PlusCircle,
  MinusCircle,
  Clock,
  ShieldOff,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { currencySymbol } from "@/lib/currency";

export default function AdminMemberDetailsPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // Modals/Forms State
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullNameVal, setFullNameVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [mobileVal, setMobileVal] = useState("");
  const [usdtAddrVal, setUsdtAddrVal] = useState("");

  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [adjustingWallet, setAdjustingWallet] = useState<string | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustRemarks, setAdjustRemarks] = useState("");

  // Delete/Block state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setFullNameVal(json.member?.fullName || "");
        setEmailVal(json.member?.email || "");
        setMobileVal(json.member?.mobile || "");
        setUsdtAddrVal(json.member?.usdtWalletAddress || "");
      } else {
        toast.error("Failed to load member details");
      }
    } catch {
      toast.error("An error occurred loading member details");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) {
      void loadData();
    }
  }, [loadData, memberId]);

  async function handleToggleStatus() {
    if (!confirm("Are you sure you want to toggle this member's activation status?")) return;
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_status", statusType: "active" }),
      });
      if (res.ok) {
        toast.success("Activation status updated successfully");
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          fullName: fullNameVal,
          email: emailVal,
          mobile: mobileVal,
          usdtWalletAddress: usdtAddrVal,
        }),
      });
      if (res.ok) {
        toast.success("Profile updated successfully");
        setEditingProfile(false);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update profile");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleBlockToggle() {
    const action = data?.member?.isBlocked ? "Unblock" : "Block";
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this member's login access?`)) return;
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block_toggle", reason: `Admin ${action.toLowerCase()}ed from member detail page` }),
      });
      if (res.ok) {
        toast.success(`Member ${action.toLowerCase()}ed successfully`);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action.toLowerCase()} member`);
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleDelete() {
    if (deleteConfirmId !== memberId) {
      toast.error("Member ID does not match");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Deleted from member detail page by admin" }),
      });
      if (res.ok) {
        toast.success(`Member ${memberId} permanently deleted`);
        window.location.href = "/admin/members";
      } else {
        const err = await res.json();
        toast.error(err.error || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          password: newPassword,
        }),
      });
      if (res.ok) {
        toast.success("Password reset successfully");
        setResettingPassword(false);
        setNewPassword("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reset password");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleAdjustWallet(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!adjustRemarks.trim()) {
      toast.error("Please enter remarks/reason");
      return;
    }

    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wallet_adjust",
          walletType: adjustingWallet,
          direction: adjustDirection,
          amount: amountNum,
          adminRemarks: adjustRemarks,
        }),
      });
      if (res.ok) {
        toast.success(`Wallet successfully ${adjustDirection}ed`);
        setAdjustingWallet(null);
        setAdjustAmount("");
        setAdjustRemarks("");
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to adjust wallet balance");
      }
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <AdminSubnav />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-lg text-ink-muted animate-pulse">Loading Member Details...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!data?.member) {
    return (
      <DashboardShell>
        <AdminSubnav />
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neon-magenta mb-4">Member Not Found</h2>
          <Link href="/admin/members" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Members
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const m = data.member;
  const symbol = currencySymbol(m.country);

  const wallets = [
    { label: "USDT Wallet", key: "usdt", balance: m.usdtWalletBalance || 0 },
    { label: "Referral Wallet", key: "referral", balance: m.totalReferralIncome || 0 },
    { label: "Matching Wallet", key: "matching", balance: m.totalMatchingIncome || 0 },
    { label: "Booster Wallet", key: "booster", balance: m.boosterWalletBalance || 0 },
    { label: "Nivesh Wallet", key: "nivesh", balance: m.nivshWalletBalance || 0 },
    { label: "Returns Wallet", key: "returns", balance: m.totalReturnsIncome || 0 },
    { label: "Rewards Wallet", key: "rewards", balance: m.totalRewardIncome || 0 },
    { label: "Main Wallet Balance", key: "main", balance: m.walletBalance || 0 },
  ];

  return (
    <DashboardShell>
      <AdminSubnav />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Link href="/admin/members" className="flex items-center gap-2 text-ink-muted hover:text-neon-cyan transition">
          <ArrowLeft size={16} /> Back to Members
        </Link>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setEditingProfile(true)} 
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <Edit2 size={14} /> Edit Profile Info
          </button>
          <button 
            onClick={() => setResettingPassword(true)} 
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <Lock size={14} /> Reset Password
          </button>
          <button 
            onClick={handleToggleStatus} 
            className={`btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 ${m.isActive ? "bg-neon-magenta/20 border-neon-magenta/40 hover:bg-neon-magenta/30" : "bg-neon-green/20 border-neon-green/40 hover:bg-neon-green/30"}`}
          >
            {m.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
            {m.isActive ? "Deactivate Account" : "Activate Account"}
          </button>
          <button
            onClick={handleBlockToggle}
            className={`btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 ${
              m.isBlocked
                ? "bg-neon-green/20 border-neon-green/40 hover:bg-neon-green/30"
                : "bg-red-500/20 border-red-500/40 hover:bg-red-500/30"
            }`}
          >
            {m.isBlocked ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
            {m.isBlocked ? "Unblock Login" : "Block Login"}
          </button>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmId(""); }}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 bg-red-500/20 border-red-500/40 hover:bg-red-500/30"
          >
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Profile Summary Card */}
        <div className="glass-card p-6 flex flex-col items-center text-center h-fit">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 mb-4">
            {m.profilePhotoUrl ? (
              <Image src={m.profilePhotoUrl} alt={m.fullName} fill sizes="112px" unoptimized className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-3xl font-bold text-white">
                {m.fullName?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-white">{m.fullName}</h2>
          <p className="text-sm text-ink-muted mb-2">Member ID: {m.memberId}</p>
          
          <div className="w-full border-t border-white/10 my-4 pt-4 text-left space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-neon-cyan" />
              <span className="truncate">{m.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-neon-cyan" />
              <span>{m.mobile || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-neon-cyan" />
              <span>Registered: {new Date(m.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Layers size={16} className="text-neon-cyan" />
              <span>Sponsor: {m.sponsorId || "N/A"} ({m.position || "N/A"})</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <ShieldAlert size={16} className="text-neon-cyan" />
              <span>USDT Address: <span className="text-xs break-all font-mono text-ink-muted">{m.usdtWalletAddress || "Not Set"}</span></span>
            </div>
          </div>
          
          <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-left">
            <div>
              <p className="text-xs text-ink-muted">Account Status</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${m.isActive ? "bg-neon-green/20 text-neon-green" : "bg-neon-magenta/20 text-neon-magenta"}`}>
                {m.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Premium Status</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${m.isPremium ? "bg-yellow-400/20 text-yellow-400" : "bg-white/10 text-ink-muted"}`}>
                {m.isPremium ? "Premium" : "Standard"}
              </span>
            </div>
            {m.isPremium && (
              <div className="col-span-2 pt-1">
                <p className="text-[10px] text-ink-muted">Premium Expires: <span className="text-white font-medium">{new Date(m.premiumExpiresAt).toLocaleDateString()}</span></p>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-ink-muted">Withdrawals Control</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${m.withdrawalsEnabled !== false ? "bg-neon-green/20 text-neon-green" : "bg-neon-magenta/20 text-neon-magenta"}`}>
                {m.withdrawalsEnabled !== false ? "Allowed" : "Blocked"}
              </span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-ink-muted">Directs Count</p>
              <p className="text-sm font-semibold text-white mt-1">{data.directMembersCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Wallet Management & Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions Card */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Quick Restrictions & Member Controls</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={async () => {
                  if (!confirm(`Are you sure you want to ${m.withdrawalsEnabled !== false ? "disable" : "enable"} withdrawals for this member?`)) return;
                  const res = await fetch(`/api/admin/members/${memberId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "update_profile", withdrawalsEnabled: m.withdrawalsEnabled !== false ? false : true }),
                  });
                  if (res.ok) {
                    toast.success("Withdrawals privilege updated");
                    loadData();
                  } else {
                    toast.error("Failed to update withdrawals privilege");
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 px-3 rounded-lg border transition ${m.withdrawalsEnabled !== false ? "bg-neon-magenta/10 border-neon-magenta/20 text-neon-magenta hover:bg-neon-magenta/20" : "bg-neon-green/10 border-neon-green/20 text-neon-green hover:bg-neon-green/20"}`}
              >
                {m.withdrawalsEnabled !== false ? "Block Withdrawals" : "Allow Withdrawals"}
              </button>

              <button 
                onClick={async () => {
                  const action = m.isPremium ? "deactivate" : "activate";
                  if (!confirm(`Are you sure you want to ${action} Premium Membership for this member?`)) return;
                  const res = await fetch("/api/admin/premium", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ memberId: m.memberId, action }),
                  });
                  if (res.ok) {
                    toast.success("Premium status updated successfully");
                    loadData();
                  } else {
                    toast.error("Failed to update Premium status");
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 px-3 rounded-lg border transition ${m.isPremium ? "bg-neon-magenta/10 border-neon-magenta/20 text-neon-magenta hover:bg-neon-magenta/20" : "bg-yellow-400/10 border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20"}`}
              >
                {m.isPremium ? "Revoke Premium" : "Activate Premium"}
              </button>

              {m.isPremium && (
                <button 
                  onClick={async () => {
                    const days = prompt("Enter number of days to extend membership:", "30");
                    if (!days) return;
                    const res = await fetch("/api/admin/premium", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ memberId: m.memberId, action: "extend", extendDays: days }),
                    });
                    if (res.ok) {
                      toast.success(`Premium extended by ${days} days`);
                      loadData();
                    } else {
                      toast.error("Failed to extend Premium membership");
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-2 px-3 rounded-lg border border-neon-cyan/20 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition"
                >
                  Extend Premium
                </button>
              )}
            </div>
          </div>
          
          {/* Wallet Balances Card */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Wallet className="text-neon-cyan" size={20} /> Wallet Balances
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((w) => (
                <div key={w.key} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-ink-muted">{w.label}</p>
                    <p className="font-display text-xl font-bold mt-1 text-white">
                      {symbol}{w.balance.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                    <button 
                      onClick={() => {
                        setAdjustingWallet(w.key);
                        setAdjustDirection("credit");
                      }}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition"
                    >
                      <PlusCircle size={12} /> Credit
                    </button>
                    <button 
                      onClick={() => {
                        setAdjustingWallet(w.key);
                        setAdjustDirection("debit");
                      }}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/20 hover:bg-neon-magenta/20 transition"
                    >
                      <MinusCircle size={12} /> Debit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Section */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock className="text-neon-cyan" size={20} /> Recent Account Activity
            </h3>
            
            <div className="space-y-6">
              
              {/* Recent Wallet Adjustments */}
              <div>
                <p className="text-sm font-semibold text-white/80 mb-2 border-b border-white/5 pb-1">Admin Wallet Transactions</p>
                {data.walletHistory?.length === 0 ? (
                  <p className="text-xs text-ink-muted">No manual adjustments recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-ink-muted border-b border-white/5">
                          <th className="py-1.5">Date</th>
                          <th className="py-1.5">Wallet</th>
                          <th className="py-1.5">Type</th>
                          <th className="py-1.5 text-right">Amount</th>
                          <th className="py-1.5 pl-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.walletHistory?.map((tx: any) => (
                          <tr key={tx._id} className="border-b border-white/5 last:border-0">
                            <td className="py-1.5 text-ink-muted">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-1.5 font-medium uppercase">{tx.walletType}</td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${tx.type === "credit" ? "bg-neon-green/10 text-neon-green" : "bg-neon-magenta/10 text-neon-magenta"}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-semibold text-white">{symbol}{tx.amount.toLocaleString()}</td>
                            <td className="py-1.5 pl-4 text-ink-muted truncate max-w-[200px]" title={tx.adminRemarks}>{tx.adminRemarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent User Transactions */}
              <div>
                <p className="text-sm font-semibold text-white/80 mb-2 border-b border-white/5 pb-1">Income & Investment Transactions</p>
                {data.recentTransactions?.length === 0 ? (
                  <p className="text-xs text-ink-muted">No transactions found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-ink-muted border-b border-white/5">
                          <th className="py-1.5">Date</th>
                          <th className="py-1.5">Type</th>
                          <th className="py-1.5">Direction</th>
                          <th className="py-1.5 text-right">Amount</th>
                          <th className="py-1.5 pl-4">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTransactions?.map((tx: any) => (
                          <tr key={tx._id} className="border-b border-white/5 last:border-0">
                            <td className="py-1.5 text-ink-muted">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-1.5 capitalize font-medium">{tx.type.replace(/_/g, " ")}</td>
                            <td className="py-1.5 capitalize">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tx.direction === "credit" ? "bg-neon-green/10 text-neon-green" : "bg-neon-magenta/10 text-neon-magenta"}`}>
                                {tx.direction}
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-semibold text-white">{tx.currency} {tx.amount.toLocaleString()}</td>
                            <td className="py-1.5 pl-4 text-ink-muted truncate max-w-[200px]" title={tx.note}>{tx.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Edit Profile Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted block mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullNameVal} 
                  onChange={(e) => setFullNameVal(e.target.value)} 
                  className="input-field w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={emailVal} 
                  onChange={(e) => setEmailVal(e.target.value)} 
                  className="input-field w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Mobile Number</label>
                <input 
                  type="text" 
                  value={mobileVal} 
                  onChange={(e) => setMobileVal(e.target.value)} 
                  className="input-field w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">USDT Wallet Address</label>
                <input 
                  type="text" 
                  value={usdtAddrVal} 
                  onChange={(e) => setUsdtAddrVal(e.target.value)} 
                  className="input-field w-full text-sm font-mono"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 text-sm py-2">Save Changes</button>
                <button 
                  type="button" 
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-ink transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Reset Member Password</h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted block mb-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="At least 6 characters"
                  className="input-field w-full text-sm"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 text-sm py-2">Reset Password</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setResettingPassword(false);
                    setNewPassword("");
                  }}
                  className="flex-1 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-ink transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Adjust Credit/Debit Modal */}
      {adjustingWallet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white capitalize">
              {adjustDirection} {adjustingWallet} Wallet
            </h3>
            <form onSubmit={handleAdjustWallet} className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted block mb-1">Amount</label>
                <input 
                  type="number" 
                  step="any"
                  value={adjustAmount} 
                  onChange={(e) => setAdjustAmount(e.target.value)} 
                  placeholder="0.00"
                  className="input-field w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Remarks / Reason</label>
                <textarea 
                  value={adjustRemarks} 
                  onChange={(e) => setAdjustRemarks(e.target.value)} 
                  placeholder="e.g. Manual correction by Admin"
                  className="input-field w-full text-sm min-h-[80px]"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 text-sm py-2 capitalize">{adjustDirection}</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setAdjustingWallet(null);
                    setAdjustAmount("");
                    setAdjustRemarks("");
                  }}
                  className="flex-1 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 text-ink transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Member Account</h3>
                <p className="text-xs text-ink-muted">This is permanent and cannot be undone.</p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-1 text-sm">
              <p className="text-white font-semibold">{m.fullName}</p>
              <p className="text-ink-muted">{m.memberId} · {m.email}</p>
            </div>
            <div>
              <label className="text-xs text-red-400 block mb-1.5 font-semibold">
                Type <span className="font-mono text-white">{m.memberId}</span> to confirm:
              </label>
              <input
                className="input-field w-full font-mono text-sm"
                placeholder={m.memberId}
                value={deleteConfirmId}
                onChange={(e) => setDeleteConfirmId(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmId !== m.memberId}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmId(""); }}
                className="flex-1 py-2.5 text-sm rounded-xl border border-white/10 hover:bg-white/5 text-ink transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}
