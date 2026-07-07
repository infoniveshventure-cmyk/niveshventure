"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { Search, Trash2, AlertTriangle, Clock, ShieldAlert, User } from "lucide-react";

export default function AdminRemoveUserPage() {
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchError, setSearchError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [removing, setRemoving] = useState(false);

  const [removalLog, setRemovalLog] = useState<any[]>([]);
  const [logLoaded, setLogLoaded] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchId.trim()) return;
    setSearching(true);
    setFoundUser(null);
    setSearchError("");
    try {
      const res = await fetch(`/api/admin/members/${encodeURIComponent(searchId.trim())}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFoundUser(data.member);
      } else {
        const err = await res.json();
        setSearchError(err.error || "Member not found");
      }
    } catch {
      setSearchError("Network error — please try again");
    } finally {
      setSearching(false);
    }
  }

  async function handleRemove() {
    if (!foundUser) return;
    if (confirmId !== foundUser.memberId) {
      toast.error("Member ID does not match");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for removal");
      return;
    }
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/members/${foundUser.memberId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        toast.success(`Member ${foundUser.memberId} permanently removed`);
        setFoundUser(null);
        setSearchId("");
        setReason("");
        setConfirmId("");
        setShowModal(false);
        loadRemovalLog();
      } else {
        const err = await res.json();
        toast.error(err.error || "Removal failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRemoving(false);
    }
  }

  async function loadRemovalLog() {
    setLogLoaded(false);
    try {
      const res = await fetch("/api/admin/audit-logs?actionType=user_deleted&limit=20", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRemovalLog(data.logs || []);
      }
    } catch {
      // silently fail — log is not critical
    } finally {
      setLogLoaded(true);
    }
  }

  // Load log on mount
  useState(() => { loadRemovalLog(); });

  const statusColor = (u: any) =>
    u.isBlocked ? "bg-red-500/20 text-red-400" :
    u.isActive ? "bg-neon-green/15 text-neon-green" :
    "bg-neon-magenta/15 text-neon-magenta";
  const statusLabel = (u: any) =>
    u.isBlocked ? "Blocked" : u.isActive ? "Active" : "Inactive";

  return (
    <DashboardShell>
      <AdminSubnav />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/30">
          <Trash2 size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Remove User ID</h1>
          <p className="text-xs text-ink-muted">Search, preview, and permanently remove a member account.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search & Preview */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Search size={16} className="text-neon-cyan" /> Search Member
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                className="input-field flex-1 text-sm"
                placeholder="Enter exact Member ID (e.g. NV12345)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                autoFocus
              />
              <button className="btn-primary text-sm px-4 whitespace-nowrap" disabled={searching}>
                {searching ? "Searching..." : "Find"}
              </button>
            </form>
            {searchError && (
              <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {searchError}
              </p>
            )}
          </div>

          {foundUser && (
            <div className="glass-card p-5 border-red-500/20">
              <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                <User size={16} className="text-neon-cyan" /> Member Details
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{foundUser.fullName}</p>
                    <p className="text-xs text-ink-muted font-mono mt-0.5">{foundUser.memberId}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor(foundUser)}`}>
                    {statusLabel(foundUser)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3">
                  <div>
                    <p className="text-ink-muted">Email</p>
                    <p className="text-white mt-0.5 truncate">{foundUser.email}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Mobile</p>
                    <p className="text-white mt-0.5">{foundUser.mobile || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Sponsor ID</p>
                    <p className="text-white mt-0.5">{foundUser.sponsorId || "None"}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Main Wallet</p>
                    <p className="text-neon-cyan font-semibold mt-0.5">${(foundUser.walletBalance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Rank</p>
                    <p className="text-white mt-0.5">{foundUser.rank || "Unranked"}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Joined</p>
                    <p className="text-white mt-0.5">{new Date(foundUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-red-500/20">
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>Removing this account is permanent. All user data, wallet balances, and binary tree connections will be deleted. This action cannot be undone.</span>
                </div>
                <button
                  onClick={() => { setShowModal(true); setReason(""); setConfirmId(""); }}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition"
                >
                  <Trash2 size={14} className="inline mr-2" />
                  Remove This Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Removal Log */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Clock size={16} className="text-neon-cyan" /> Removal Audit Log
          </h2>
          {!logLoaded ? (
            <p className="text-xs text-ink-muted animate-pulse">Loading log...</p>
          ) : removalLog.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-8">No removal records found.</p>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {removalLog.map((log: any) => (
                <div key={log._id} className="p-3 border border-white/5 bg-white/3 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-red-400">{log.metadata?.deletedMemberId || log.targetMemberId}</span>
                    <span className="text-ink-muted">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-white">{log.metadata?.deletedFullName || "—"}</p>
                  <p className="text-ink-muted">Email: {log.metadata?.deletedEmail || "—"}</p>
                  <div className="flex items-center gap-1 pt-1 border-t border-white/5">
                    <ShieldAlert size={11} className="text-amber-400" />
                    <span className="text-amber-400 font-medium">Admin:</span>
                    <span className="text-ink-muted">{log.actorId}</span>
                  </div>
                  {log.metadata?.reason && (
                    <p className="text-ink-muted italic">Reason: {log.metadata.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && foundUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Account Removal</h3>
                <p className="text-xs text-red-400">This action cannot be reversed.</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-white">{foundUser.fullName}</p>
              <p className="text-ink-muted">{foundUser.memberId} · {foundUser.email}</p>
            </div>

            <div>
              <label className="text-xs text-ink-muted block mb-1 font-semibold">Reason for Removal <span className="text-red-400">*</span></label>
              <textarea
                className="input-field w-full text-sm min-h-[80px]"
                placeholder="e.g. Duplicate account, policy violation, user request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-red-400 block mb-1.5 font-semibold">
                Type <span className="font-mono text-white">{foundUser.memberId}</span> to confirm:
              </label>
              <input
                className="input-field w-full font-mono text-sm"
                placeholder={foundUser.memberId}
                value={confirmId}
                onChange={(e) => setConfirmId(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRemove}
                disabled={removing || confirmId !== foundUser.memberId || !reason.trim()}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition disabled:opacity-40"
              >
                {removing ? "Removing..." : "Permanently Remove"}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
