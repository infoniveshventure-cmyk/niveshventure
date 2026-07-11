"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { HelpCircle, ArrowUpRight, ArrowDownRight, Award, Zap, Vote } from "lucide-react";
import Link from "next/link";

export default function PredictionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });
  
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [upVotes, setUpVotes] = useState(64);
  const [downVotes, setDownVotes] = useState(36);

  const handleVote = (direction: "up" | "down") => {
    if (voted) return;
    setVoted(direction);
    if (direction === "up") {
      setUpVotes((v) => v + 1);
    } else {
      setDownVotes((v) => v + 1);
    }
  };

  const totalVotes = upVotes + downVotes;
  const upPercent = Math.round((upVotes / totalVotes) * 100);
  const downPercent = Math.round((downVotes / totalVotes) * 100);

  return (
    <section ref={sectionRef} id="prediction-arena" className="relative py-16 md:py-24 bg-transparent overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-neon-violet/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-16">
          <p className="text-xs font-semibold text-neon-cyan tracking-widest uppercase mb-2">
            Interactive Daily Pools
          </p>
          <h2 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight">
            Daily Market <span className="gradient-text">Prediction Arena</span>
          </h2>
          <p className="text-white/70 mt-3 max-w-xl mx-auto text-xs md:text-sm">
            Put your market intuition to the test. Cast your prediction daily to lock in matching yields, maximize active returns, and climb the leaderboard!
          </p>
        </div>

        {/* Prediction Game Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Information & Rules - Left Side */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center text-neon-cyan flex-shrink-0">
                <Vote size={20} />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white">1. Predict Daily</h3>
                <p className="text-xs md:text-sm text-white/60 mt-1">
                  Cast your prediction on major market index directions before the daily countdown locks the pool.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-neon-violet/15 flex items-center justify-center text-neon-violet flex-shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white">2. Keep Returns Active</h3>
                <p className="text-xs md:text-sm text-white/60 mt-1">
                  Submitting your prediction daily ensures your binary matching and static ROI return channels remain fully unlocked.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-neon-magenta/15 flex items-center justify-center text-neon-magenta flex-shrink-0">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white">3. Claim Accuracy Bonuses</h3>
                <p className="text-xs md:text-sm text-white/60 mt-1">
                  Build accurate prediction streaks to multiply your returns and earn exclusive VIP rank badges.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Card - Right Side */}
          <div className="lg:col-span-7 flex justify-center w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6 }}
              className="w-full max-w-lg glass-card border border-white/10 p-5 md:p-8 relative overflow-hidden rounded-3xl"
              style={{
                background: "rgba(18, 14, 38, 0.45)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.08)"
              }}
            >
              {/* Card top badge */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                  <span className="text-[10px] md:text-xs font-semibold text-neon-green uppercase tracking-wider">Active Pool #284</span>
                </div>
                <div className="text-[10px] md:text-xs text-white/50">Ends in: <span className="text-white font-mono font-bold">14h 28m</span></div>
              </div>

              {/* Question */}
              <div className="space-y-2 mb-6">
                <div className="text-xs text-neon-cyan font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <HelpCircle size={12} /> Today's Forecast Pool
                </div>
                <h4 className="text-base md:text-xl font-bold text-white leading-relaxed">
                  Will Bitcoin (BTC/USDT) close positive or finish above $68,500 at the end of the trading cycle?
                </h4>
              </div>

              {/* Interactive buttons */}
              <AnimatePresence mode="wait">
                {!voted ? (
                  <motion.div 
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <button
                      onClick={() => handleVote("up")}
                      className="group relative overflow-hidden rounded-2xl flex flex-col items-center justify-center p-4 border border-neon-green/20 bg-neon-green/[0.03] hover:bg-neon-green/[0.08] hover:border-neon-green/40 transition-all duration-300"
                    >
                      <ArrowUpRight size={28} className="text-neon-green mb-2 group-hover:scale-110 group-hover:-translate-y-1 transition-transform" />
                      <span className="text-xs md:text-sm font-bold text-white">PREDICT UP</span>
                      <span className="text-[9px] text-white/40 mt-1">Bullish Index</span>
                    </button>

                    <button
                      onClick={() => handleVote("down")}
                      className="group relative overflow-hidden rounded-2xl flex flex-col items-center justify-center p-4 border border-neon-magenta/20 bg-neon-magenta/[0.03] hover:bg-neon-magenta/[0.08] hover:border-neon-magenta/40 transition-all duration-300"
                    >
                      <ArrowDownRight size={28} className="text-neon-magenta mb-2 group-hover:scale-110 group-hover:translate-y-1 transition-transform" />
                      <span className="text-xs md:text-sm font-bold text-white">PREDICT DOWN</span>
                      <span className="text-[9px] text-white/40 mt-1">Bearish Index</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Confirmation Message */}
                    <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl text-center">
                      <p className="text-xs font-semibold text-neon-cyan">
                        🎯 Mock Prediction Submitted Successfully!
                      </p>
                      <p className="text-[10px] text-white/60 mt-1">
                        Sign up or login to submit actual predictions and lock in daily yields.
                      </p>
                    </div>

                    {/* Results Pools */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs text-white/80 font-medium px-1">
                        <span>Predict UP 📈</span>
                        <span>{upPercent}% ({upVotes} votes)</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${upPercent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-neon-green"
                        />
                        <div className="h-full bg-neon-magenta flex-1" />
                      </div>
                      <div className="flex justify-between text-xs text-white/80 font-medium px-1 pt-1">
                        <span>Predict DOWN 📉</span>
                        <span>{downPercent}% ({downVotes} votes)</span>
                      </div>
                    </div>

                    {/* Register Button */}
                    <div className="pt-2 text-center">
                      <Link 
                        href="/register" 
                        className="inline-block bg-white text-[#0D0D1A] font-bold text-xs md:text-sm px-6 py-2.5 rounded-full hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
                      >
                        Start Earning Daily Now
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>

        </div>

      </div>
    </section>
  );
}
