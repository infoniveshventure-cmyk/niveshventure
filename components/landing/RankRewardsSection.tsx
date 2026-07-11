"use client";

import { useState, useRef } from "react";
import { useInView, motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { Shield, Users, Trophy, Award, Star } from "lucide-react";

const REWARDS_DATA = [
  {
    rank: "X1",
    level: "Level 1",
    tierName: "Challenger",
    stars: 1,
    left: 20,
    right: 20,
    reward: "$100",
    description: "Launch your career. Balance your core left and right teams with 20 active partners to unlock Challenger tier and receive your cash prize.",
    color: "#E6A15C",
    badgeColor: "from-[#CD7F32]/25 to-transparent",
    borderColor: "border-[#CD7F32]/40",
    textColor: "text-[#E6A15C]",
    glowColor: "rgba(205, 127, 50, 0.3)"
  },
  {
    rank: "X2",
    level: "Level 2",
    tierName: "Elite",
    stars: 2,
    left: 50,
    right: 50,
    reward: "$300",
    description: "Elevate your leadership. Reaching 50 partners on both sides establishes your authority and commands a premium Elite bonus payout.",
    color: "#E2E2E2",
    badgeColor: "from-[#C0C0C0]/25 to-transparent",
    borderColor: "border-[#C0C0C0]/40",
    textColor: "text-[#E2E2E2]",
    glowColor: "rgba(192, 192, 192, 0.3)"
  },
  {
    rank: "X3",
    level: "Level 3",
    tierName: "Master",
    stars: 3,
    left: 100,
    right: 100,
    reward: "$700",
    description: "Become a master networker. Anchor 100 left and 100 right node connections. Commemorates your achievement with high matching yield gains.",
    color: "#FFD700",
    badgeColor: "from-[#FFD700]/25 to-transparent",
    borderColor: "border-[#FFD700]/40",
    textColor: "text-[#FFD700]",
    glowColor: "rgba(255, 215, 0, 0.3)"
  },
  {
    rank: "X4",
    level: "Level 4",
    tierName: "Grandmaster",
    stars: 4,
    left: 250,
    right: 250,
    reward: "$2000",
    description: "Command global velocity. Oversee 250 node coordinates across left and right binary channels. Unlocks unmatched passive matching flow.",
    color: "#00E5FF",
    badgeColor: "from-[#00E5FF]/25 to-transparent",
    borderColor: "border-[#00E5FF]/40",
    textColor: "text-[#00E5FF]",
    glowColor: "rgba(0, 229, 255, 0.3)"
  },
  {
    rank: "X5",
    level: "Level 5",
    tierName: "Legend",
    stars: 5,
    left: 500,
    right: 500,
    reward: "$5000",
    description: "Ultimate platform supremacy. Rule the binary matrix with 500 left and 500 right members. Claims the highest tier reward and global prestige.",
    color: "#7B5CFF",
    badgeColor: "from-[#7B5CFF]/25 to-transparent",
    borderColor: "border-[#7B5CFF]/40",
    textColor: "text-[#9E8BFF]",
    glowColor: "rgba(123, 92, 255, 0.4)"
  },
];

export default function RankRewardsSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Scroll link for 3D parallax depth
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [10, -10]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [-15, 15]);

  const activeRank = REWARDS_DATA[activeIdx];

  return (
    <section ref={sectionRef} id="rewards" className="relative py-16 md:py-24 bg-transparent overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 relative z-10">

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#0d1831] border border-white/10 flex items-center justify-center">
            <Image src="/logo1.png" alt="Nivesh Ventures" width={20} height={20} className="object-contain" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-bold text-xs md:text-sm tracking-[0.12em] text-white">Nivesh</span>
          </div>
        </div>

        {/* Title + 3D transparent shield */}
        <div className="mb-10 md:mb-12 flex items-center gap-4 flex-wrap">
          <h2
            className="text-3xl md:text-5xl font-bold tracking-wide text-white uppercase"
            style={{
              textShadow: "0 0 10px rgba(255, 255, 255, 0.45), 0 0 25px rgba(255, 255, 255, 0.15)"
            }}
          >
            RANK REWARDS
          </h2>

          {/* <div className="relative w-16 h-16 flex items-center justify-center" style={{ perspective: 800 }}>
            <motion.div
              style={{ 
                y,
                rotateX,
                rotateY,
                transformStyle: "preserve-3d"
              }}
              className="pointer-events-none w-full h-full flex items-center justify-center"
            >
              <Image 
                src="/rank_rewards_shield.png" 
                alt="Rank Rewards Shield" 
                width={70} 
                height={70} 
                className="object-contain mix-blend-screen opacity-90 filter drop-shadow-[0_0_12px_rgba(255,215,0,0.35)]"
              />
            </motion.div>
          </div> */}
        </div>

        <p className="text-white/60 text-xs md:text-sm mb-10 max-w-xl -mt-6">
          Climb the binary ladder. Tap each rank level below to preview reward bonuses, matching multiplier tiers, and milestones.
        </p>

        {/* Interactive Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Interactive Ladder List */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-3 lg:pb-0 w-full" style={{ scrollbarWidth: "none" }}>
            {REWARDS_DATA.map((row, idx) => {
              const isActive = activeIdx === idx;
              return (
                <button
                  key={row.rank}
                  onClick={() => setActiveIdx(idx)}
                  className={`flex-shrink-0 lg:w-full flex items-center gap-3.5 px-5 py-3 md:py-4 rounded-xl border text-left transition-all duration-300 ${isActive
                      ? `border-[${row.color}] bg-white/[0.08] shadow-[0_4px_20px_${row.glowColor}] translate-x-1`
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                    }`}
                  style={{
                    borderColor: isActive ? row.color : "rgba(255,255,255,0.1)",
                  }}
                >
                  {/* Rank circle indicator */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all"
                    style={{
                      background: isActive ? row.color : "rgba(255, 255, 255, 0.1)",
                      color: isActive ? "#0D0D1A" : "#FFFFFF"
                    }}
                  >
                    {row.rank}
                  </div>

                  <div>
                    <h3 className="font-bold text-xs md:text-sm text-white leading-none">{row.tierName}</h3>
                    <p className="text-[9px] md:text-[10px] text-white/50 mt-1 uppercase tracking-wider">{row.level}</p>
                  </div>

                  {/* Star indicators on right (desktop only) */}
                  <div className="hidden md:flex ml-auto items-center gap-0.5">
                    {Array.from({ length: row.stars }).map((_, sIdx) => (
                      <Star key={sIdx} size={10} style={{ fill: row.color, stroke: row.color }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Premium Glass Detail Card */}
          <div className="lg:col-span-8 w-full">

            {/* The Glass Detail Card */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRank.rank}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card border p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[360px]"
                  style={{
                    background: "rgba(18, 14, 38, 0.65)",
                    borderColor: "rgba(255,255,255,0.15)",
                    boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1), 0 0 40px ${activeRank.glowColor}`
                  }}
                >
                  {/* Card Background Glow Orb */}
                  <div
                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[70px] pointer-events-none transition-all duration-500"
                    style={{ background: activeRank.color, opacity: 0.15 }}
                  />

                  {/* Badge & Title */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-gradient-to-r ${activeRank.badgeColor} ${activeRank.borderColor} ${activeRank.textColor}`}>
                        {Array.from({ length: activeRank.stars }).map((_, s) => (
                          <Star key={s} size={9} style={{ fill: activeRank.color, stroke: activeRank.color }} />
                        ))}
                        {activeRank.tierName} Tier
                      </span>
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">{activeRank.level}</span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Rank Milestone Rewards</h3>
                    <p className="text-xs md:text-sm text-white/70 leading-relaxed">{activeRank.description}</p>
                  </div>

                  {/* Targets Progression representation */}
                  <div className="my-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-white/80 font-medium mb-1.5">
                        <span className="flex items-center gap-1"><Users size={12} className="text-neon-cyan" /> Left Node Coordination</span>
                        <span className="font-bold text-white">{activeRank.left} active members</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-cyan rounded-full w-full" style={{ filter: "drop-shadow(0 0 4px #00E5FF)" }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-white/80 font-medium mb-1.5">
                        <span className="flex items-center gap-1"><Users size={12} className="text-neon-violet" /> Right Node Coordination</span>
                        <span className="font-bold text-white">{activeRank.right} active members</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-violet rounded-full w-full" style={{ filter: "drop-shadow(0 0 4px #7B5CFF)" }} />
                      </div>
                    </div>
                  </div>

                  {/* Cash Reward Announcement */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-5 mt-auto">
                    <span className="text-xs font-semibold text-white/60 tracking-wider flex items-center gap-1.5"><Trophy size={14} className="text-yellow-400" /> ACHIEVEMENT CASH</span>
                    <div className="text-right">
                      <span
                        className="text-2xl md:text-3xl font-extrabold text-neon-green tracking-wide block"
                        style={{ textShadow: "0 0 10px rgba(0, 255, 163, 0.4)" }}
                      >
                        {activeRank.reward}
                      </span>
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
