"use client";

import { Check, Rocket, X } from "lucide-react";

const PER_LEVEL = 5;

type DirectMember = {
  memberId: string;
  fullName: string;
  isActive: boolean;
};

export default function DirectProgressCard({
  directCount,
  isActive = false,
  directsList = [],
}: {
  directCount: number;
  isActive?: boolean;
  directsList?: DirectMember[];
}) {
  // Level 1 logic specifically requested:
  // Show first 5 directs corresponding to Level 1.
  // Real-time check: Count only Active and Fully Registered (isActive === true) directs.
  const level1Directs = directsList.slice(0, PER_LEVEL);
  const activeCount = level1Directs.filter((d) => d.isActive).length;
  const remainingNeeded = Math.max(0, PER_LEVEL - activeCount);
  const percent = Math.round((activeCount / PER_LEVEL) * 100);

  // Message block based on requirements
  const statusMessage =
    activeCount >= PER_LEVEL
      ? "Great! All direct requirements completed successfully."
      : `You need ${remainingNeeded} more active Direct member${remainingNeeded === 1 ? "" : "s"} to complete your directs requirement.`;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-semibold flex items-center gap-2">
          Your Direct Progress
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isActive
                ? "bg-neon-green/20 text-neon-green border border-neon-green/45"
                : "bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/45"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </h2>
      </div>
      <p className="text-xs text-ink-muted mb-6">
        {statusMessage}
      </p>

      <div className="flex items-center justify-between mb-6">
        {Array.from({ length: PER_LEVEL }).map((_, i) => {
          const stepNum = i + 1;
          const directUser = level1Directs[i];
          const hasDirect = !!directUser;
          const isUserActive = hasDirect && directUser.isActive;

          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${isUserActive ? "bg-neon-green" : "bg-white/10"}`} />
                )}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors duration-300 ${
                    isUserActive
                      ? "bg-neon-green text-base text-white"
                      : hasDirect
                      ? "bg-neon-magenta/20 border-2 border-neon-magenta text-neon-magenta"
                      : "border-2 border-dashed border-neon-violet/50 text-neon-violet"
                  }`}
                  title={hasDirect ? `${directUser.fullName} (${directUser.isActive ? "Active" : "Inactive"})` : "Slot Empty"}
                >
                  {isUserActive ? (
                    <Check size={16} />
                  ) : hasDirect ? (
                    <X size={14} />
                  ) : (
                    stepNum
                  )}
                </div>
                {i < PER_LEVEL - 1 && (
                  <div className={`h-0.5 flex-1 ${isUserActive ? "bg-neon-green" : "bg-white/10"}`} />
                )}
              </div>
              <span className={`text-[10px] text-center font-medium truncate max-w-[64px] ${isUserActive ? "text-neon-green" : hasDirect ? "text-neon-magenta" : "text-ink-muted"}`} title={hasDirect ? directUser.fullName : `Direct ${stepNum}`}>
                {hasDirect ? directUser.fullName.split(" ")[0] : `Direct ${stepNum}`}
                {hasDirect && (
                  <span className="block text-[8px] opacity-75 font-mono">
                    {directUser.isActive ? "✅" : "❌"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between bg-base-soft rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neon-violet/20 flex items-center justify-center">
            <Rocket size={16} className="text-neon-violet" />
          </div>
          <p className="text-xs sm:text-sm">
            {activeCount === 0 ? (
              <>Share your referral link to start inviting directs!</>
            ) : (
              <>Great! You have {activeCount} out of {PER_LEVEL} active Directs.<br />You're {percent}% there!</>
            )}
          </p>
        </div>
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff1a" strokeWidth="4" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={activeCount >= PER_LEVEL ? "#00E676" : "#7B5CFF"}
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - percent / 100)}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">{percent}%</span>
        </div>
      </div>
    </div>
  );
}
