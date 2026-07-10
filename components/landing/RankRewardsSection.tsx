"use client";

import { useRef } from "react";
import { useInView, motion } from "framer-motion";
import Image from "next/image";

const REWARDS_DATA = [
  { rank: "X1", level: "Level 1", left: 20, right: 20, reward: "$100" },
  { rank: "X2", level: "Level 2", left: 50, right: 50, reward: "$300" },
  { rank: "X3", level: "Level 3", left: 100, right: 100, reward: "$700" },
  { rank: "X4", level: "Level 4", left: 250, right: 250, reward: "$2000" },
  { rank: "X5", level: "Level 5", left: 500, right: 500, reward: "$5000" },
];

export default function RankRewardsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} className="relative py-12 md:py-24 bg-transparent overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 relative z-10">
        
        {/* Nivesh Brand Header on Top Left */}
        <div className="flex items-center gap-2 mb-8 md:mb-12">
          <div className="w-8 h-8 rounded-lg bg-[#0d1831] border border-white/10 flex items-center justify-center">
            <Image src="/logo1.png" alt="Nivesh Ventures" width={20} height={20} className="object-contain" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-bold text-xs md:text-sm tracking-[0.12em] text-white">Nivesh</span>
          </div>
        </div>

        {/* Glow Header Title */}
        <div className="mb-10 md:mb-16">
          <h2 
            className="text-3xl md:text-5xl font-bold tracking-wide text-white uppercase"
            style={{ 
              textShadow: "0 0 10px rgba(255, 255, 255, 0.45), 0 0 25px rgba(255, 255, 255, 0.2)"
            }}
          >
            RANK REWARDS
          </h2>
        </div>

        {/* 2-Column Grid (Table & Shield Illustration) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Table Container - Left Side */}
          <div className="lg:col-span-7 w-full overflow-x-auto">
            <table className="w-full border-collapse border border-white/60 text-center font-display text-sm md:text-base text-white">
              <thead>
                <tr className="bg-[#1062AC] text-white font-bold">
                  <th className="border border-white/60 py-3.5 px-4 tracking-wider uppercase font-semibold">Rank</th>
                  <th className="border border-white/60 py-3.5 px-4 tracking-wider uppercase font-semibold">Level</th>
                  <th className="border border-white/60 py-3.5 px-4 tracking-wider uppercase font-semibold">Left</th>
                  <th className="border border-white/60 py-3.5 px-4 tracking-wider uppercase font-semibold">Right</th>
                  <th className="border border-white/60 py-3.5 px-4 tracking-wider uppercase font-semibold">Reward</th>
                </tr>
              </thead>
              <tbody>
                {REWARDS_DATA.map((row, idx) => (
                  <tr 
                    key={row.rank} 
                    className="hover:bg-white/[0.04] transition-colors"
                    style={{ background: "rgba(18, 14, 38, 0.5)" }}
                  >
                    <td className="border border-white/60 py-4 px-4 font-bold">{row.rank}</td>
                    <td className="border border-white/60 py-4 px-4 text-white/90">{row.level}</td>
                    <td className="border border-white/60 py-4 px-4 text-white/90">{row.left}</td>
                    <td className="border border-white/60 py-4 px-4 text-white/90">{row.right}</td>
                    <td className="border border-white/60 py-4 px-4 font-bold text-white">{row.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shield pedestal - Right Side */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-full max-w-[380px] aspect-square flex items-center justify-center"
            >
              <Image 
                src="/rank_rewards_shield.png" 
                alt="Rank Rewards Shield Pedestal" 
                width={450} 
                height={450} 
                className="object-contain drop-shadow-[0_0_35px_rgba(0,229,255,0.2)]"
              />
            </motion.div>
          </div>

        </div>

      </div>
    </section>
  );
}
