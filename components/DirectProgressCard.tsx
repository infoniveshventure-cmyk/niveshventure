"use client";

import { Check, Rocket } from "lucide-react";

const PER_LEVEL = 5;

export default function DirectProgressCard({ directCount, isActive = false }: { directCount: number; isActive?: boolean }) {
  const level = Math.floor(directCount / PER_LEVEL) + 1;
  const inLevel = directCount % PER_LEVEL;
  const percent = Math.round((inLevel / PER_LEVEL) * 100);
  const remaining = PER_LEVEL - inLevel;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold flex items-center gap-2">
          Your Direct Progress
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            isActive ? "bg-neon-green/20 text-neon-green border border-neon-green/45" : "bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/45"
          }`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </h2>
        <span className="text-xs px-3 py-1 rounded-full bg-neon-violet/20 text-neon-violet border border-neon-violet/40 flex items-center gap-1">
          ★ Level {level}
        </span>
      </div>
      <p className="text-xs text-ink-muted mb-6">
        {remaining === PER_LEVEL ? `You need ${PER_LEVEL} Directs to complete this level` : `You need ${remaining} more Direct${remaining === 1 ? "" : "s"} to complete this level`}
      </p>

      <div className="flex items-center justify-between mb-6">
        {Array.from({ length: PER_LEVEL }).map((_, i) => {
          const stepNum = i + 1;
          const done = stepNum <= inLevel;
          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${stepNum <= inLevel ? "bg-neon-green" : "bg-white/10"}`} />
                )}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    done
                      ? "bg-neon-green text-base"
                      : "border-2 border-dashed border-neon-violet/50 text-neon-violet"
                  }`}
                >
                  {done ? <Check size={16} /> : stepNum}
                </div>
                {i < PER_LEVEL - 1 && (
                  <div className={`h-0.5 flex-1 ${stepNum < inLevel ? "bg-neon-green" : "bg-white/10"}`} />
                )}
              </div>
              <span className={`text-xs ${done ? "text-neon-green" : "text-ink-muted"}`}>Direct {stepNum}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between bg-base-soft rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neon-violet/20 flex items-center justify-center">
            <Rocket size={16} className="text-neon-violet" />
          </div>
          <p className="text-sm">
            {inLevel === 0 ? (
              <>Share your referral link to start Level {level}!</>
            ) : (
              <>Great! You've added {inLevel} out of {PER_LEVEL} Directs.<br />You're {percent}% there!</>
            )}
          </p>
        </div>
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff1a" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none" stroke="#7B5CFF" strokeWidth="4"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - percent / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">{percent}%</span>
        </div>
      </div>
    </div>
  );
}
