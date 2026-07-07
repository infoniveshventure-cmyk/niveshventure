"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { Wallet, TrendingUp, Users, Trophy, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import DirectProgressCard from "@/components/DirectProgressCard";
import TransactionChart from "@/components/TransactionChart";

type Tx = { _id: string; type: string; direction: "credit" | "debit"; amount: number; currency: string; createdAt: string; note: string };

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerUrl, setBannerUrl] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meRes, walletRes, settingsRes] = await Promise.all([
          fetch("/api/user/me", { cache: "no-store" }),
          fetch("/api/wallet", { cache: "no-store" }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          setStats(me.stats);
        }
        if (walletRes.ok) {
          const w = await walletRes.json();
          setTransactions(w.transactions || []);
        }
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setBannerUrl(s.settings?.dashboardWelcomeBannerUrl || "");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    fetch("/api/admin/offers", { cache: "no-store" }).then((r) => r.json()).then((d) => setOffers(d.offers || []));
  }, []);

  const cards = [
    { label: "Wallet Balance", value: profile?.walletBalance ?? 0, icon: Wallet, prefix: "$", href: "/wallet" },
    { label: "Total Earnings", value:
        (profile?.totalReferralIncome || 0) + (profile?.totalMatchingIncome || 0) +
        (profile?.totalReturnsIncome || 0) + (profile?.totalLevelIncome || 0) + (profile?.totalRewardIncome || 0),
      icon: TrendingUp, prefix: "$", href: "/income" },
    { label: "Total Team", value: stats?.totalTeam ?? 0, icon: Users, prefix: "", href: "/team" },
    { label: "Current Rank", value: profile?.rank ?? "Unranked", icon: Trophy, prefix: "", href: "/rewards" },
  ];

  return (
    <DashboardShell>
      {/* ── Welcome Hero Card ── */}
      <div
        className="mb-6 relative overflow-hidden rounded-2xl p-5 lg:p-7"
        style={{
          background: "linear-gradient(135deg, #0d1535 0%, #111b40 55%, #0d1a3a 100%)",
          border: "1px solid rgba(99,130,255,0.25)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 10% 50%, rgba(123,92,255,0.12) 0%, transparent 60%)" }} />

        <div className="relative z-10 flex items-center gap-5 justify-between">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden ring-2 ring-white/20">
                {profile?.profilePhotoUrl ? (
                  <Image src={profile.profilePhotoUrl} alt={profile.fullName} fill sizes="96px" unoptimized className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-2xl font-bold text-white">
                    {profile?.fullName?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-ink-muted text-sm mb-0.5">Welcome back,</p>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-white leading-tight">
                {profile?.fullName || "Member"}
              </h1>

              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                  profile?.isActive
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                    : "bg-white/8 text-ink-muted border border-white/15"
                }`}>
                  {profile?.isActive && <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
                  {profile?.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-ink-muted text-sm mt-2">Member ID: <span className="text-ink font-medium">{profile?.memberId || "—"}</span></p>
            </div>
          </div>

          {/* Welcome Banner or Shield */}
          {bannerUrl ? (
            <div className="relative h-24 w-48 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <Image src={bannerUrl} alt="Welcome Banner" fill sizes="192px" unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="hidden sm:flex shrink-0 items-center justify-center w-24 h-24 lg:w-32 lg:h-32 relative select-none pointer-events-none">
              <div className="absolute inset-0 pointer-events-none rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, rgba(0,229,255,0.4) 0%, transparent 70%)" }} />
              <div className="absolute inset-3 rounded-full border border-neon-cyan/20 animate-pulse" />
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl flex items-center justify-center font-display font-black text-xl lg:text-2xl"
                style={{
                  background: "linear-gradient(145deg, #1a2a5e, #0e1a40)",
                  border: "2px solid rgba(218,165,32,0.6)",
                  boxShadow: "0 4px 20px rgba(0,229,255,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
                  color: "#f5c842",
                }}>
                NV
              </div>
            </div>
          )}
        </div>
      </div>

      {offers.length > 0 && (
        <div className="flex gap-3 overflow-x-auto mb-6 pb-1">
          {offers.map((o) => (
            <div key={o._id} className="shrink-0 glass-card border-neon-magenta/40 p-4 min-w-[220px]">
              <p className="text-sm font-semibold text-neon-magenta">{o.title}</p>
              <p className="text-xs text-ink-muted mt-1">{o.message}</p>
              {o.price > 0 && (
                <p className="text-sm font-bold text-neon-cyan mt-2">${o.price.toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="stat-card group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center mb-3">
              <c.icon size={18} className="text-base" />
            </div>
            <p className="text-xs text-ink-muted">{c.label}</p>
            <p className="font-display text-xl font-bold mt-1 group-hover:text-neon-cyan transition">
              {c.prefix}{typeof c.value === "number" ? c.value.toLocaleString() : c.value}
            </p>
          </Link>
        ))}
      </div>

      <DirectProgressCard directCount={stats?.direct ?? 0} isActive={profile?.isActive ?? false} />

      {/* ── Activity chart ── */}
      <TransactionChart transactions={transactions} />

      <div className="glass-card p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Recent Transactions</h2>
          <Link href="/wallet" className="text-xs text-neon-cyan hover:underline">View all →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No transactions yet. Activity will appear here once it happens.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 3).map((t) => (
              <div key={t._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    t.direction === "credit" ? "bg-neon-green/15 text-neon-green" : "bg-neon-magenta/15 text-neon-magenta"
                  }`}>
                    {t.direction === "credit" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{t.type.replace(/_/g, " ")}</p>
                    {t.note && <p className="text-xs text-neon-cyan mt-0.5">{t.note}</p>}
                    <p className="text-[10px] text-ink-muted">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${t.direction === "credit" ? "text-neon-green" : "text-ink"}`}>
                  {t.direction === "credit" ? "+" : "-"}${t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-5 mt-6">
        <h2 className="font-display font-semibold mb-4">Business Details</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-ink-muted">Direct</p><p className="font-semibold mt-0.5">{stats?.direct ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Total Team</p><p className="font-semibold mt-0.5">{stats?.totalTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Left Team</p><p className="font-semibold mt-0.5">{stats?.leftTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Right Team</p><p className="font-semibold mt-0.5">{stats?.rightTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Left Active Team</p><p className="font-semibold mt-0.5 text-neon-green">{stats?.leftActiveTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Right Active Team</p><p className="font-semibold mt-0.5 text-neon-green">{stats?.rightActiveTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Strong Leg</p><p className="font-semibold mt-0.5 text-neon-green">{(stats?.leftActiveTeam ?? 0) >= (stats?.rightActiveTeam ?? 0) ? "Left" : "Right"}</p></div>
          <div><p className="text-xs text-ink-muted">Weaker Leg</p><p className="font-semibold mt-0.5 text-neon-magenta">{(stats?.leftActiveTeam ?? 0) >= (stats?.rightActiveTeam ?? 0) ? "Right" : "Left"}</p></div>
          <div><p className="text-xs text-ink-muted">Left Carry Forward</p><p className="font-semibold mt-0.5">${(stats?.leftCarryForward ?? profile?.leftCarryForward ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Right Carry Forward</p><p className="font-semibold mt-0.5">${(stats?.rightCarryForward ?? profile?.rightCarryForward ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Left Current Business</p><p className="font-semibold mt-0.5">${(stats?.leftCurrentBusiness ?? profile?.leftCurrentBusiness ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Right Current Business</p><p className="font-semibold mt-0.5">${(stats?.rightCurrentBusiness ?? profile?.rightCurrentBusiness ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Left Total Business</p><p className="font-semibold mt-0.5">${(stats?.leftTotalBusiness ?? profile?.leftTotalBusiness ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Right Total Business</p><p className="font-semibold mt-0.5">${(stats?.rightTotalBusiness ?? profile?.rightTotalBusiness ?? 0).toLocaleString()}</p></div>
        </div>
      </div>
    </DashboardShell>
  );
}
