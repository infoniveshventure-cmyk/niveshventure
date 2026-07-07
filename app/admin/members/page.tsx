"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import Link from "next/link";
import { Search, Pin, ArrowUp, ArrowDown, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/members?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(memberId: string, current: boolean) {
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, isActive: !current }),
    });
    if (res.ok) {
      toast.success(`Member ${!current ? "activated" : "deactivated"}`);
      load();
    } else {
      toast.error("Update failed");
    }
  }

  async function togglePin(memberId: string, currentPin: boolean) {
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, isPinned: !currentPin, action: "pin" }),
    });
    if (res.ok) {
      toast.success(!currentPin ? "Member pinned to top" : "Member unpinned");
      load();
    } else {
      toast.error("Pin toggle failed");
    }
  }

  async function toggleBlock(memberId: string, isBlocked: boolean) {
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "block_toggle", reason: "Admin action from members list" }),
    });
    if (res.ok) {
      toast.success(isBlocked ? "Member unblocked" : "Member blocked");
      load();
    } else {
      toast.error("Block/unblock failed");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmId !== deleteTarget.memberId) {
      toast.error("Member ID does not match. Please type the exact Member ID to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/members/${deleteTarget.memberId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Deleted from members list by admin" }),
      });
      if (res.ok) {
        toast.success(`Member ${deleteTarget.memberId} permanently deleted`);
        setDeleteTarget(null);
        setDeleteConfirmId("");
        load();
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

  async function shiftOrder(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;

    const currentMember = members[index];
    const targetMember = members[targetIndex];

    const currentOrder = currentMember.sortOrder || 0;
    const targetOrder = targetMember.sortOrder || 0;

    const res1 = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: currentMember.memberId, sortOrder: targetOrder || (index + 1), action: "reorder" }),
    });

    const res2 = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: targetMember.memberId, sortOrder: currentOrder || (index + 2), action: "reorder" }),
    });

    if (res1.ok && res2.ok) {
      toast.success("Position updated");
      load();
    } else {
      toast.error("Reorder failed");
    }
  }

  return (
    <DashboardShell>
      <AdminSubnav />
      <h1 className="font-display text-2xl font-bold mb-6">Member Management</h1>

      <div className="glass-card p-5">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 mb-4">
          <input className="input-field flex-1" placeholder="Search by name, ID or email" value={q}
            onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary flex items-center gap-2"><Search size={15} /> Search</button>
        </form>

        {loading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : !members.length ? (
          <p className="text-sm text-ink-muted py-8 text-center">No members found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-white/10">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Member</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr key={m.memberId} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-4 flex items-center gap-1">
                      <button disabled={idx === 0} onClick={() => shiftOrder(idx, "up")} className="text-ink-muted hover:text-neon-cyan disabled:opacity-30">
                        <ArrowUp size={14} />
                      </button>
                      <button disabled={idx === members.length - 1} onClick={() => shiftOrder(idx, "down")} className="text-ink-muted hover:text-neon-cyan disabled:opacity-30">
                        <ArrowDown size={14} />
                      </button>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/members/${m.memberId}`} className="font-medium hover:text-neon-cyan transition-colors flex items-center gap-1.5">
                        {m.fullName}
                        {m.isPinned && <Pin size={12} className="text-yellow-400 rotate-45 fill-yellow-400" />}
                      </Link>
                      <p className="text-xs text-ink-muted">{m.memberId}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-muted">{m.email}</td>
                    <td className="py-2.5 pr-4">{m.rank}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                          m.isBlocked
                            ? "bg-red-500/20 text-red-400"
                            : m.isActive
                            ? "bg-neon-green/15 text-neon-green"
                            : "bg-neon-magenta/15 text-neon-magenta"
                        }`}>
                          {m.isBlocked ? "Blocked" : m.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Lock/Unlock profile */}
                        <button onClick={() => toggleActive(m.memberId, m.isActive)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-white/15 hover:border-neon-cyan/60 transition whitespace-nowrap">
                          {m.isActive ? "Lock" : "Unlock"}
                        </button>

                        {/* Block/Unblock login */}
                        <button
                          onClick={() => toggleBlock(m.memberId, m.isBlocked)}
                          title={m.isBlocked ? "Unblock Login" : "Block Login"}
                          className={`p-1.5 rounded-lg border transition ${
                            m.isBlocked
                              ? "bg-neon-green/10 border-neon-green/30 text-neon-green hover:bg-neon-green/20"
                              : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {m.isBlocked ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                        </button>

                        {/* Pin */}
                        <button onClick={() => togglePin(m.memberId, m.isPinned)}
                          className={`p-1.5 rounded-lg border transition ${m.isPinned ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400" : "border-white/15 hover:border-yellow-400/60"}`}
                          title={m.isPinned ? "Unpin member" : "Pin member"}
                        >
                          <Pin size={13} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => { setDeleteTarget(m); setDeleteConfirmId(""); }}
                          title="Delete member permanently"
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Member</h3>
                <p className="text-xs text-ink-muted">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-1 text-sm">
              <p className="text-white font-semibold">{deleteTarget.fullName}</p>
              <p className="text-ink-muted">{deleteTarget.memberId} · {deleteTarget.email}</p>
            </div>

            <div>
              <label className="text-xs text-red-400 block mb-1.5 font-semibold">
                Type <span className="font-mono text-white">{deleteTarget.memberId}</span> to confirm deletion:
              </label>
              <input
                className="input-field w-full font-mono text-sm"
                placeholder={deleteTarget.memberId}
                value={deleteConfirmId}
                onChange={(e) => setDeleteConfirmId(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmDelete}
                disabled={deleting || deleteConfirmId !== deleteTarget.memberId}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmId(""); }}
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
