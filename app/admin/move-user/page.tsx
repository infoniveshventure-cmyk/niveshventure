"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { Search, GitBranch, ArrowRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function AdminMoveUserPage() {
  // Step 1: search user to move
  const [userId, setUserId] = useState("");
  const [searching, setSearching] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [searchError, setSearchError] = useState("");

  // Step 2: search new parent
  const [newParentId, setNewParentId] = useState("");
  const [newParentSearch, setNewParentSearch] = useState("");
  const [newParentInfo, setNewParentInfo] = useState<any>(null);
  const [parentSlots, setParentSlots] = useState<{ left: boolean; right: boolean }>({ left: true, right: true });
  const [searchingParent, setSearchingParent] = useState(false);
  const [parentError, setParentError] = useState("");

  const [newPosition, setNewPosition] = useState<"left" | "right">("left");
  const [reason, setReason] = useState("");
  const [moving, setMoving] = useState(false);

  async function handleSearchUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    setSearching(true);
    setUserInfo(null);
    setSearchError("");
    try {
      const res = await fetch(`/api/admin/move-user?userId=${encodeURIComponent(userId.trim())}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setUserInfo(data);
      } else {
        setSearchError(data.error || "User not found");
      }
    } catch {
      setSearchError("Network error");
    } finally {
      setSearching(false);
    }
  }

  async function handleSearchParent(e: React.FormEvent) {
    e.preventDefault();
    if (!newParentSearch.trim()) return;
    setSearchingParent(true);
    setNewParentInfo(null);
    setParentError("");
    setParentSlots({ left: true, right: true });
    try {
      const res = await fetch(`/api/admin/members/${encodeURIComponent(newParentSearch.trim())}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        // Check which slots are occupied
        const member = data.member;
        setNewParentId(member.memberId);
        setNewParentInfo(member);
        // Fetch their children
        const childRes = await fetch(`/api/admin/move-user?userId=${encodeURIComponent(member.memberId)}`);
        // We use the siblings to figure out slot availability
        const slots = { left: true, right: true };
        // Check if parent itself occupies left/right
        if (member.memberId === userInfo?.user?.memberId) {
          setParentError("Cannot use the same user as parent");
          return;
        }
        // Hit the list to check occupancy
        const listRes = await fetch(`/api/admin/members?q=${encodeURIComponent(member.memberId)}`, { cache: "no-store" });
        // Just trust the API for slot availability; slot check is done on submit
        setParentSlots(slots);
      } else {
        setParentError(data.error || "Parent not found");
      }
    } catch {
      setParentError("Network error");
    } finally {
      setSearchingParent(false);
    }
  }

  async function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (!userInfo || !newParentInfo) return;
    if (!reason.trim()) {
      toast.error("Please provide a reason for this move");
      return;
    }
    if (!confirm(`Move ${userInfo.user.memberId} to ${newPosition} of ${newParentInfo.memberId}?\n\nThis will update the binary tree and recalculate all business stats. Continue?`)) return;

    setMoving(true);
    try {
      const res = await fetch("/api/admin/move-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userInfo.user.memberId,
          newParentId: newParentInfo.memberId,
          newPosition,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        // Refresh user info to show new placement
        const updated = await fetch(`/api/admin/move-user?userId=${encodeURIComponent(userInfo.user.memberId)}`, { cache: "no-store" });
        if (updated.ok) setUserInfo(await updated.json());
        setNewParentInfo(null);
        setNewParentSearch("");
        setReason("");
      } else {
        toast.error(data.error || "Move failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setMoving(false);
    }
  }

  const isSelf = newParentInfo?.memberId === userInfo?.user?.memberId;

  return (
    <DashboardShell>
      <AdminSubnav />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-neon-violet/15 flex items-center justify-center border border-neon-violet/30">
          <GitBranch size={18} className="text-neon-violet" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Move User in Binary Tree</h1>
          <p className="text-xs text-ink-muted">Reposition a member and recalculate the entire binary structure automatically.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Find user to move */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan text-xs flex items-center justify-center font-bold">1</span>
              Find User to Move
            </h2>
            <form onSubmit={handleSearchUser} className="flex gap-2">
              <input
                className="input-field flex-1 text-sm"
                placeholder="Enter Member ID to move"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <button className="btn-primary text-sm px-4" disabled={searching}>
                {searching ? "..." : <Search size={14} />}
              </button>
            </form>
            {searchError && <p className="mt-2 text-xs text-red-400">{searchError}</p>}
          </div>

          {/* Current placement info */}
          {userInfo?.user && (
            <div className="glass-card p-5 border-neon-cyan/20">
              <h3 className="font-semibold text-sm mb-3 text-neon-cyan">Current Placement</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Member</span>
                  <span className="font-semibold text-white">{userInfo.user.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Member ID</span>
                  <span className="font-mono text-white">{userInfo.user.memberId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Sponsor ID</span>
                  <span className="font-mono text-white">{userInfo.user.sponsorId || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Current Parent</span>
                  <span className="font-mono text-white">
                    {userInfo.user.parentId ? `${userInfo.user.parentId}` : "Root"}
                    {userInfo.parent && <span className="text-ink-muted ml-1">({userInfo.parent.fullName})</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Current Position</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    userInfo.user.position === "left" ? "bg-neon-cyan/15 text-neon-cyan" : "bg-neon-violet/15 text-neon-violet"
                  }`}>
                    {userInfo.user.position || "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Rank</span>
                  <span className="text-white">{userInfo.user.rank || "Unranked"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select new placement */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="w-6 h-6 rounded-full bg-neon-violet/20 text-neon-violet text-xs flex items-center justify-center font-bold">2</span>
              Select New Placement
            </h2>

            {!userInfo?.user ? (
              <p className="text-xs text-ink-muted text-center py-6">Search and select a user in Step 1 first.</p>
            ) : (
              <form onSubmit={handleMove} className="space-y-4">
                {/* New Parent Search */}
                <div>
                  <label className="text-xs text-ink-muted block mb-1.5 font-semibold">New Parent Member ID</label>
                  <div className="flex gap-2">
                    <input
                      className="input-field flex-1 text-sm"
                      placeholder="Enter new parent Member ID"
                      value={newParentSearch}
                      onChange={(e) => setNewParentSearch(e.target.value)}
                    />
                    <button type="button" onClick={handleSearchParent} className="btn-primary text-sm px-4" disabled={searchingParent}>
                      {searchingParent ? "..." : <Search size={14} />}
                    </button>
                  </div>
                  {parentError && <p className="mt-1.5 text-xs text-red-400">{parentError}</p>}
                </div>

                {/* New Parent Info */}
                {newParentInfo && (
                  <div className={`p-3 rounded-xl border text-sm space-y-1 ${isSelf ? "border-red-500/30 bg-red-500/5" : "border-neon-green/20 bg-neon-green/5"}`}>
                    {isSelf ? (
                      <p className="text-red-400 text-xs">Cannot use the same user as their own parent.</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-neon-green" />
                          <span className="font-semibold text-white">{newParentInfo.fullName}</span>
                        </div>
                        <p className="text-xs text-ink-muted">{newParentInfo.memberId} · {newParentInfo.email}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Position selector */}
                <div>
                  <label className="text-xs text-ink-muted block mb-1.5 font-semibold">New Position</label>
                  <div className="flex gap-2">
                    {(["left", "right"] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setNewPosition(pos)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition capitalize ${
                          newPosition === pos
                            ? pos === "left"
                              ? "bg-neon-cyan/15 border-neon-cyan text-neon-cyan"
                              : "bg-neon-violet/15 border-neon-violet text-neon-violet"
                            : "border-white/10 text-ink-muted hover:border-white/20"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs text-ink-muted block mb-1.5 font-semibold">Reason for Move <span className="text-red-400">*</span></label>
                  <textarea
                    className="input-field w-full text-sm min-h-[70px]"
                    placeholder="e.g. Admin restructure, correcting wrong placement..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                {/* Summary */}
                {userInfo?.user && newParentInfo && !isSelf && (
                  <div className="flex items-center gap-3 text-xs p-3 bg-neon-violet/5 border border-neon-violet/20 rounded-xl">
                    <Info size={14} className="text-neon-violet shrink-0" />
                    <span className="text-ink-muted">
                      Moving <span className="text-white font-semibold">{userInfo.user.memberId}</span> from{" "}
                      <span className="font-mono">{userInfo.user.parentId || "root"}/{userInfo.user.position || "—"}</span>
                      {" "}<ArrowRight size={10} className="inline" />{" "}
                      <span className="font-mono">{newParentInfo.memberId}/{newPosition}</span>.
                      Business stats will be recalculated automatically.
                    </span>
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>This permanently changes the binary tree. Left/Right Business and Team counts will be recalculated for all affected ancestors.</span>
                  </div>
                  <button
                    type="submit"
                    disabled={moving || !newParentInfo || isSelf || !reason.trim()}
                    className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-40"
                  >
                    {moving ? "Moving..." : "Move User & Recalculate"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
