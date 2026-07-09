"use client";

import { useRef } from "react";
import { useInView, motion } from "framer-motion";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const RANKS = [
  { rank: "Bronze", team: "0–49", reward: "$0", bonus: "Starter", color: "#CD7F32", bg: "rgba(205,127,50,0.15)", progress: 10 },
  { rank: "Silver", team: "50–199", reward: "$250", bonus: "Travel Voucher", color: "#C0C0C0", bg: "rgba(192,192,192,0.15)", progress: 28 },
  { rank: "Gold", team: "200–499", reward: "$1,000", bonus: "Gold Trophy", color: "#FFD700", bg: "rgba(255,215,0,0.15)", progress: 52 },
  { rank: "Diamond", team: "500–999", reward: "$5,000", bonus: "Luxury Trip", color: "#B9F2FF", bg: "rgba(185,242,255,0.15)", progress: 75 },
  { rank: "Crown", team: "1,000+", reward: "$10,000", bonus: "Brand New Car", color: "#7B5CFF", bg: "rgba(123,92,255,0.15)", progress: 100 },
];

export default function RankRewardsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} className="relative py-8 md:py-20 bg-[#050914]">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center mb-6 md:mb-12">
          <p className="text-xs md:text-xs font-medium tracking-widest uppercase mb-2 md:mb-2 gradient-text-gold">
            Rank System
          </p>
          <h2 className="text-lg md:text-3xl xl:text-4xl font-display font-bold text-white">
            Climb the Ranks, <span className="gradient-text-gold">Unlock Rewards</span>
          </h2>
          <p className="text-white mt-2 md:mt-3 max-w-xl mx-auto text-xs md:text-base">
            Your team size determines your rank — and your rank unlocks extraordinary rewards
          </p>
        </div>

        {/* Rank cards */}
        <div className="space-y-2 md:space-y-4">
          {RANKS.map((r, i) => (
            <ScrollMouseInteractive key={r.rank} isInView={isInView} depth={i % 2 === 0 ? "front" : "middle"} maxTranslateY={35} maxTilt={15}>
              <div className="landing-card p-3 md:p-6 group">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                  {/* Rank badge */}
                  <div
                    className="w-10 md:w-14 h-10 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center flex-shrink-0 font-display font-bold text-xs md:text-sm group-hover:scale-110 transition-transform duration-300"
                    style={{ background: r.bg, border: `1px solid ${r.color}30`, color: r.color }}
                  >
                    {r.rank.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 md:mb-2">
                      <h3 className="font-display font-bold text-white text-base md:text-lg">{r.rank}</h3>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-xs md:text-sm">
                        <span className="text-white">Team: <span className="text-white font-medium">{r.team}</span></span>
                        <span className="text-white">Reward: <span className="font-bold" style={{ color: r.color }}>{r.reward}</span></span>
                        <span className="text-white">Bonus: <span className="text-white font-medium">{r.bonus}</span></span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${r.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(to right, ${r.color}, ${r.color}88)` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollMouseInteractive>
          ))}
        </div>
      </div>
    </section>
  );
}
