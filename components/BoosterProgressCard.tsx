"use client";

import { Check, Zap, AlertCircle, Calendar, Users, Trophy } from "lucide-react";

type BoosterInfo = {
  qualificationExpiry: string;
  directsCount: number;
  daysRemaining: number;
  status: "In Progress" | "Qualified" | "Expired" | "Reward Credited" | string;
};

export default function BoosterProgressCard({
  booster,
  registrationDate,
}: {
  booster?: BoosterInfo;
  registrationDate?: string;
}) {
  if (!booster) return null;

  const { directsCount = 0, daysRemaining = 0, status = "In Progress", qualificationExpiry } = booster;

  // Configuration (tier steps)
  const tier1Target = 3;
  const tier2Target = 5;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reward Credited":
        return "bg-neon-green/20 text-neon-green border-neon-green/45";
      case "Qualified":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "Expired":
        return "bg-white/10 text-ink-muted border-white/10";
      default:
        return "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40 animate-pulse";
    }
  };

  const expiryDate = qualificationExpiry ? new Date(qualificationExpiry) : null;
  const formattedExpiry = expiryDate
    ? expiryDate.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const percent = Math.min(100, Math.round((directsCount / tier2Target) * 100));

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap size={16} className="text-white animate-bounce" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-sm sm:text-base">7 Days Booster Income</h2>
            <p className="text-[10px] text-ink-muted">Unlock rewards within 7 days of registration</p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getStatusColor(status)}`}
        >
          {status}
        </span>
      </div>

      {/* Expiry / Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white/5 border border-white/5 rounded-xl text-xs mb-6">
        <div className="flex items-center gap-1.5 text-ink-muted">
          <Calendar size={13} className="text-amber-500" />
          <span>Ends: <span className="text-white font-medium">{formattedExpiry}</span></span>
        </div>
        {status !== "Expired" && status !== "Reward Credited" && (
          <div className="flex items-center gap-1.5 text-ink-muted">
            <AlertCircle size={13} className="text-neon-cyan" />
            <span>Time Left: <span className="text-neon-cyan font-bold">{daysRemaining} Day{daysRemaining === 1 ? "" : "s"}</span></span>
          </div>
        )}
      </div>

      {/* Target & Current Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 text-ink-muted mb-1">
            <Users size={14} className="text-neon-cyan" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Eligible Directs</span>
          </div>
          <p className="text-xl font-bold text-white">
            {directsCount} <span className="text-xs text-ink-muted">Active</span>
          </p>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 text-ink-muted mb-1">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Current Reward</span>
          </div>
          <p className="text-xl font-bold text-amber-400">
            ${directsCount >= 5 ? 30 : directsCount >= 3 ? 15 : 0} <span className="text-xs text-ink-muted">USDT</span>
          </p>
        </div>
      </div>

      {/* Tier Steps Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs font-semibold text-white">
          <span>Target Progress</span>
          <span>{percent}%</span>
        </div>
        <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-ink-muted">
          <div className="flex flex-col items-start">
            <span className="font-bold text-white">0</span>
            <span>Start</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`font-bold ${directsCount >= 3 ? "text-neon-green" : "text-white"}`}>
              {directsCount >= 3 ? "✓ 3" : "3"}
            </span>
            <span>$15 Reward</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`font-bold ${directsCount >= 5 ? "text-neon-green" : "text-white"}`}>
              {directsCount >= 5 ? "✓ 5" : "5"}
            </span>
            <span>$30 Reward</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {status === "In Progress" && (
        <p className="text-[10px] text-ink-muted/80 mt-5 italic text-center">
          * Refer {Math.max(0, 3 - directsCount)} more active user{Math.max(0, 3 - directsCount) === 1 ? "" : "s"} to unlock the first $15 Booster Reward!
        </p>
      )}
      {status === "Qualified" && directsCount < 5 && (
        <p className="text-[10px] text-ink-muted/80 mt-5 italic text-center">
          * Refer {5 - directsCount} more active user{5 - directsCount === 1 ? "" : "s"} to upgrade your reward to $30!
        </p>
      )}
      {status === "Reward Credited" && (
        <p className="text-[10px] text-neon-green mt-5 font-medium text-center">
          ✓ Congratulations! You successfully achieved the highest Booster reward.
        </p>
      )}
      {status === "Expired" && directsCount < 3 && (
        <p className="text-[10px] text-red-500/80 mt-5 font-medium text-center">
          ✕ The booster qualification period has expired.
        </p>
      )}
    </div>
  );
}
