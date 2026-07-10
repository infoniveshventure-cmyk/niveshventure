"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { Gift, Trophy, Lock, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

interface RewardLog {
  _id: string;
  rewardType: string;
  amount: number;
  status: "pending" | "released" | "cancelled";
  createdAt: string;
  adminRemarks?: string;
}

const ranks = [
  { code: "X1", level: "Level 1", left: 20, right: 20, reward: 100 },
  { code: "X2", level: "Level 2", left: 50, right: 50, reward: 300 },
  { code: "X3", level: "Level 3", left: 100, right: 100, reward: 700 },
  { code: "X4", level: "Level 4", left: 250, right: 250, reward: 2000 },
  { code: "X5", level: "Level 5", left: 500, right: 500, reward: 5000 },
];

export default function RewardsPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<RewardLog[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, rewardsRes] = await Promise.all([
          fetch("/api/user/me", { cache: "no-store" }),
          fetch("/api/rewards", { cache: "no-store" })
        ]);

        if (meRes.ok) {
          const d = await meRes.json();
          setStats(d.stats);
        }

        if (rewardsRes.ok) {
          const data = await rewardsRes.json();
          setLogs(data.logs || []);
          setBreakdown(data.breakdown || {});
          setTotalEarned(data.totalEarned || 0);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const leftTeam  = stats?.leftActiveTeam  ?? 0;
  const rightTeam = stats?.rightActiveTeam ?? 0;

  // Determine qualification statuses chronologically (based on member counts)
  let foundFirstUnachieved = false;
  const processedRanks = ranks.map((r) => {
    const isAchieved = leftTeam >= r.left && rightTeam >= r.right;
    let status: "Achieved" | "In Progress" | "Locked" = "Locked";

    if (isAchieved) {
      status = "Achieved";
    } else if (!foundFirstUnachieved) {
      status = "In Progress";
      foundFirstUnachieved = true;
    }

    return {
      ...r,
      status,
    };
  });

  // Filter out Rank Reward history entries
  const rankRewardLogs = logs.filter(
    (log) => log.rewardType === "rank_reward" || (log.adminRemarks && log.adminRemarks.includes("Rank Reward"))
  );

  return (
    <DashboardShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/30 flex items-center justify-center border border-amber-500/30">
            <Trophy size={18} className="text-[#FFD700]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Rank & Reward</h1>
            <p className="text-xs text-ink-muted">Qualify for team milestones and claim exclusive rank bonuses</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted animate-pulse">Loading rewards statements...</p>
      ) : (
        <div className="space-y-6">
          
          {/* Main Earnings Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card border-yellow-500/10">
              <p className="text-xs text-ink-muted font-medium">Total Rewards Earned</p>
              <p className="font-display text-2xl font-bold mt-1 text-[#FFD700]">${totalEarned.toLocaleString()}</p>
            </div>
            
            <div className="stat-card border-white/5">
              <p className="text-xs text-ink-muted font-medium">Main Wallet Balance</p>
              <p className="font-display text-2xl font-bold mt-1 text-neon-cyan">${(profile?.walletBalance || 0).toLocaleString()}</p>
            </div>

            <div className="stat-card border-white/5">
              <p className="text-xs text-ink-muted font-medium">Rank Rewards Wallet Balance</p>
              <p className="font-display text-2xl font-bold mt-1 text-neon-green">${(profile?.totalRewardIncome || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Ranks and Milestones Progression (Black & Gold Theme Layout) */}
          <div className="glass-card p-5 border-yellow-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="font-display font-semibold text-base mb-4 text-white flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#FFD700]" /> Rank Qualifications Progress
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {processedRanks.map((r) => {
                const isAchieved = r.status === "Achieved";
                const isInProgress = r.status === "In Progress";
                const isLocked = r.status === "Locked";

                // Progress percentage calculation based on member counts
                const leftProgress  = Math.min(100, Math.max(0, (leftTeam  / r.left)  * 100));
                const rightProgress = Math.min(100, Math.max(0, (rightTeam / r.right) * 100));
                const averageProgress = (leftProgress + rightProgress) / 2;

                return (
                  <div 
                    key={r.code} 
                    className={`stat-card relative overflow-hidden border transition-all duration-300 ${
                      isAchieved 
                        ? "border-neon-green/30 bg-neon-green/5 shadow-neon-sm" 
                        : isInProgress 
                        ? "border-neon-cyan/40 bg-neon-cyan/5 shadow-lg" 
                        : "border-white/5 bg-white/2 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isAchieved 
                          ? "bg-neon-green/10 text-neon-green" 
                          : isInProgress 
                          ? "bg-neon-cyan/10 text-neon-cyan" 
                          : "bg-white/5 text-white/20"
                      }`}>
                        <Trophy size={14} />
                      </div>
                      
                      {/* Status indicator badge */}
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isAchieved 
                          ? "bg-neon-green/20 text-neon-green" 
                          : isInProgress 
                          ? "bg-neon-cyan/20 text-neon-cyan animate-pulse" 
                          : "bg-white/5 text-white/30"
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-white flex items-center gap-1.5">
                      {r.code} <span className="text-[10px] text-ink-muted font-normal">({r.level})</span>
                    </h3>
                    
                    <div className="mt-2.5 space-y-1 text-[10px] text-ink-muted">
                      <div className="flex justify-between">
                        <span>Required Left:</span>
                        <span className="font-semibold text-white">{r.left.toLocaleString()} Members</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Left:</span>
                        <span className={`font-semibold ${leftTeam >= r.left ? "text-neon-green" : "text-white"}`}>
                          {leftTeam.toLocaleString()} Members
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-white/5">
                        <span>Required Right:</span>
                        <span className="font-semibold text-white">{r.right.toLocaleString()} Members</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Right:</span>
                        <span className={`font-semibold ${rightTeam >= r.right ? "text-neon-green" : "text-white"}`}>
                          {rightTeam.toLocaleString()} Members
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for current rank in progress */}
                    {isInProgress && (
                      <div className="mt-3.5 space-y-1">
                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-neon-cyan">
                          <span>Overall Progress</span>
                          <span>{Math.round(averageProgress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-neon-cyan to-neon-violet rounded-full transition-all duration-500" 
                            style={{ width: `${averageProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Lock state display */}
                    {isLocked && (
                      <div className="mt-4 flex items-center gap-1 text-[10px] text-white/30 font-medium">
                        <Lock size={10} /> Locked until X{ranks.findIndex(x => x.code === r.code)} Achieved
                      </div>
                    )}

                    {/* Achieved check */}
                    {isAchieved && (
                      <div className="mt-4 flex items-center gap-1 text-[10px] text-neon-green font-semibold">
                        <CheckCircle2 size={12} /> Qualified & Released
                      </div>
                    )}

                    {/* Gold Highlighted Reward Label */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-ink-muted">Reward:</span>
                      <span className="text-sm font-black text-[#FFD700]">${r.reward.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rank Rewards History Logs */}
          <div className="glass-card p-5">
            <h2 className="font-display font-semibold text-base mb-4 flex items-center gap-2 text-white">
              <Trophy size={16} className="text-[#FFD700]" /> Rank Rewards History
            </h2>
            {!rankRewardLogs.length ? (
              <p className="text-xs text-ink-muted py-6 text-center">No rank rewards achieved yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-ink-muted border-b border-white/10 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 pr-4">Date & Time</th>
                      <th className="py-2.5 pr-4">Rank</th>
                      <th className="py-2.5 pr-4">Level</th>
                      <th className="py-2.5 pr-4">Reward Amount (USD)</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankRewardLogs.map((log) => {
                      const rankCode = log.adminRemarks?.split("Rank Reward - ")[1] || "—";
                      const rankInfo = ranks.find((x) => x.code === rankCode);
                      return (
                        <tr key={log._id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="py-3 pr-4 text-ink-muted">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4 font-bold text-white uppercase">{rankCode}</td>
                          <td className="py-3 pr-4 text-ink-muted">{rankInfo?.level || "—"}</td>
                          <td className="py-3 pr-4 text-[#FFD700] font-black">${log.amount.toLocaleString()}</td>
                          <td className="py-3 pr-4">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">
                              Credited
                            </span>
                          </td>
                          <td className="py-3 text-ink-muted">
                            {log.adminRemarks || `Rank Reward Qualification for Rank ${rankCode}`}
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
      )}
    </DashboardShell>
  );
}
