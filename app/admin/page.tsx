"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import Link from "next/link";
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Clock, 
  ShieldAlert,
  Server,
  TrendingUp
} from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s auto-refresh polling
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <AdminSubnav />
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card animate-pulse bg-white/5 h-32 rounded-xl"></div>
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell>
        <AdminSubnav />
        <p className="text-sm text-neon-magenta">Admin access required, or database unavailable.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Live Control Center</h1>
          <p className="text-sm text-ink-muted mt-1">Real-time statistics & visual operations center</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-neon-green/10 border border-neon-green/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-ping"></span>
            <span className="text-[10px] font-bold text-neon-green uppercase tracking-wide">Live Polling</span>
          </div>
        </div>
      </div>

      {/* --- Live stats grid --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card bg-gradient-to-br from-neon-violet/10 to-transparent border border-neon-violet/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-ink-muted">Total Members</p>
              <p className="font-display text-2xl font-bold mt-1 text-white">{data.totalMembers}</p>
            </div>
            <Users className="text-neon-violet" size={20} />
          </div>
          <div className="text-[10px] text-ink-muted mt-2">
            Active: <span className="text-neon-green font-bold">{data.activeMembers}</span> | Inactive: <span className="text-neon-magenta">{data.inactiveMembers}</span>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-ink-muted">Active Members</p>
              <p className="font-display text-2xl font-bold mt-1 text-white">{data.activeMembers}</p>
            </div>
            <UserCheck className="text-neon-cyan" size={20} />
          </div>
          <div className="text-[10px] text-ink-muted mt-2">
            Total Business: <span className="text-white font-bold">${data.totalBusinessVolume.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-neon-green/10 to-transparent border border-neon-green/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-ink-muted">Total Wallet Balance</p>
              <p className="font-display text-2xl font-bold mt-1 text-white">${data.totalWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="text-neon-green" size={20} />
          </div>
          <div className="text-[10px] text-ink-muted mt-2">
            Today's yield business: <span className="text-neon-green font-bold">${data.todayBusiness.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-neon-magenta/10 to-transparent border border-neon-magenta/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-ink-muted">Pending Payouts</p>
              <p className="font-display text-2xl font-bold mt-1 text-neon-magenta">${data.pendingPayouts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <Clock className="text-neon-magenta" size={20} />
          </div>
          <div className="text-[10px] text-ink-muted mt-2">
            Closing Month Status: <span className="text-white font-semibold capitalize">{data.monthlyClosingStatus}</span>
          </div>
        </div>
      </div>

      {/* --- Visual indicators and health --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold mb-4 text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-neon-cyan" />
            Financial Growth Summary
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-ink-muted block uppercase">Deposits</span>
              <span className="text-sm font-bold text-neon-green mt-1 block">${data.totalDeposits.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-ink-muted block uppercase">Withdrawals</span>
              <span className="text-sm font-bold text-neon-magenta mt-1 block">${data.totalWithdrawals.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-ink-muted block uppercase">Payouts Paid</span>
              <span className="text-sm font-bold text-neon-cyan mt-1 block">${data.totalPayouts.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4 text-white flex items-center gap-2">
            <Server size={18} className="text-neon-violet" />
            System Health Indicators
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted">API Status</span>
              <span className="text-neon-green font-semibold uppercase tracking-wider">{data.systemHealth.apiStatus}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted">Database Engine</span>
              <span className="text-neon-cyan font-semibold uppercase tracking-wider">{data.systemHealth.dbStatus}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-muted">Uptime Status</span>
              <span className="text-white font-mono">{Math.floor(data.systemHealth.uptime)}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Action Center panels --- */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display font-semibold mb-4 text-white">Live Action Control Center</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/members" className="p-4 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition text-center">
            <Users className="mx-auto mb-2 text-neon-cyan" size={20} />
            <span className="text-xs text-white block">Manage Members</span>
          </Link>
          <Link href="/admin/withdrawals" className="p-4 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition text-center">
            <DollarSign className="mx-auto mb-2 text-neon-green" size={20} />
            <span className="text-xs text-white block">Manage Withdrawals</span>
          </Link>
          <Link href="/admin/monthly-closing" className="p-4 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition text-center">
            <Clock className="mx-auto mb-2 text-neon-violet" size={20} />
            <span className="text-xs text-white block">Monthly Closing</span>
          </Link>
          <Link href="/admin/support" className="p-4 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition text-center">
            <ShieldAlert className="mx-auto mb-2 text-neon-magenta" size={20} />
            <span className="text-xs text-white block">Support Tickets</span>
          </Link>
        </div>
      </div>

      {/* --- Activity feed logs --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-3">Recent registrations</h2>
          {data.recentRegistrations.map((m: any) => (
            <div key={m.memberId} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
              <span>{m.fullName} <span className="text-ink-muted text-xs">({m.memberId})</span></span>
              <span className="text-ink-muted text-xs">{new Date(m.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold mb-3">Recent transactions</h2>
          {data.recentTransactions.map((t: any) => (
            <div key={t._id} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
              <span className="capitalize">{t.type.replace(/_/g, " ")} · {t.memberId}</span>
              <span className={t.direction === "credit" ? "text-neon-green font-medium" : "text-ink-muted"}>
                {t.direction === "credit" ? "+" : "-"}{t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
