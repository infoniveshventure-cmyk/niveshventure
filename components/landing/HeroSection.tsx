"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { ArrowRight, TrendingUp, DollarSign, Users, BarChart2 } from "lucide-react";

const PARTICLES = 40;

function FloatingCard({ className, delay = 0, children }: {
  className?: string; delay?: number; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -12, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`absolute landing-card p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLES }, (_, i) => ({
      id: i,
      top: (i * 37 + 11) % 100,
      left: (i * 53 + 7) % 100,
      size: (i % 3) + 1,
      delay: (i * 0.37) % 6,
      duration: 4 + (i % 5),
    })), []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden landing-aurora">
      {/* Grid overlay */}
      <div className="absolute inset-0 landing-grid-overlay opacity-60 pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            style={{ top: `${p.top}%`, left: `${p.left}%`, width: p.size, height: p.size }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute rounded-full bg-neon-cyan"
          />
        ))}
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neon-violet/10 blur-[100px] pointer-events-none landing-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neon-cyan/8 blur-[80px] pointer-events-none" style={{ animationDelay: "3s" }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 w-full pt-8 md:pt-20 pb-8 md:pb-16">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Left: Text */}
          <div className="space-y-4 md:space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-neon-violet/30 bg-neon-violet/10 text-xs md:text-sm text-neon-cyan font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              Trusted by 50,000+ Investors Worldwide
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-2xl sm:text-3xl md:text-5xl xl:text-6xl 2xl:text-7xl font-display font-bold leading-[1.1] tracking-tight"
            >
              Build Your{" "}
              <span className="gradient-text">Financial Future</span>{" "}
              With Smart Investments
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs md:text-base text-ink-muted leading-relaxed max-w-xl"
            >
              Nivesh Ventures empowers you with multiple income streams — referral bonuses,
              matching commissions, booster rewards, and monthly returns — all in one transparent platform.
            </motion.p>

            {/* Motivational quote */}
            <motion.blockquote
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border-l-2 border-neon-violet pl-3 md:pl-5 italic text-ink-muted text-xs md:text-sm"
            >
              "Your journey starts today. Every successful investment begins with one confident step."
            </motion.blockquote>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-2 md:gap-4 flex-wrap"
            >
              <Link href="/register" className="btn-landing-primary inline-flex items-center gap-1.5 md:gap-2.5 text-xs md:text-base landing-glow-pulse">
                Get Started Free
                <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
              </Link>
              <Link href="/login" className="btn-landing-ghost inline-flex items-center gap-1.5 md:gap-2.5 text-xs md:text-base">
                Login to Dashboard
              </Link>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center gap-4 md:gap-8 pt-2"
            >
              {[
                { label: "Members", value: "50K+" },
                { label: "Volume", value: "$5M+" },
                { label: "Countries", value: "50+" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-lg md:text-xl font-bold text-white">{s.value}</div>
                  <div className="text-xs md:text-xs text-ink-muted">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Floating visual elements - hidden on mobile */}
          <div className="relative h-[520px] hidden lg:block">
            {/* Main dashboard card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute inset-x-8 top-8 landing-card p-6 landing-glow-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-ink-muted">Monthly Portfolio Growth</p>
                  <p className="text-2xl font-display font-bold text-white mt-1">+₹48,250</p>
                  <p className="text-xs text-neon-green mt-1">↑ +18.4% this month</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-neon-violet/20 flex items-center justify-center">
                  <TrendingUp size={22} className="text-neon-violet" />
                </div>
              </div>

              {/* Mini chart SVG */}
              <svg viewBox="0 0 280 60" className="w-full h-14" fill="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7B5CFF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#7B5CFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0,50 L40,40 L80,35 L120,20 L160,25 L200,10 L240,15 L280,5"
                  stroke="url(#lineGrad1)"
                  strokeWidth="2.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7B5CFF" />
                    <stop offset="100%" stopColor="#00E5FF" />
                  </linearGradient>
                </defs>
                <path d="M0,50 L40,40 L80,35 L120,20 L160,25 L200,10 L240,15 L280,5 L280,60 L0,60Z" fill="url(#chartGrad)" />
              </svg>
            </motion.div>

            {/* Floating income card */}
            <FloatingCard className="bottom-24 -left-4 w-52" delay={0.5}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neon-green/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={16} className="text-neon-green" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Referral Bonus</p>
                  <p className="text-sm font-bold text-neon-green">+$127.50</p>
                </div>
              </div>
            </FloatingCard>

            {/* Floating members card */}
            <FloatingCard className="bottom-8 right-0 w-52" delay={1}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Team Members</p>
                  <p className="text-sm font-bold text-neon-cyan">1,248 Active</p>
                </div>
              </div>
            </FloatingCard>

            {/* Floating ROI card */}
            <FloatingCard className="top-1/2 -right-4 w-44" delay={1.5}>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-neon-magenta/20 flex items-center justify-center mx-auto mb-2">
                  <BarChart2 size={16} className="text-neon-magenta" />
                </div>
                <p className="text-lg font-bold gradient-text">30%</p>
                <p className="text-[10px] text-ink-muted">Monthly ROI</p>
              </div>
            </FloatingCard>

            {/* Spinning ring decoration */}
            {/* Spinning ring decoration */}
            <div className="absolute top-[80%] left-1/2 -translate-x-1/2 -translate-y-1/2">

              {/* Outer ring */}
              <div className="w-72 h-72 rounded-full border border-neon-violet/10 landing-spin-slow" />

              {/* Inner ring */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-neon-cyan/8 pointer-events-none"
              />

              {/* Logo center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full overflow-hidden flex items-center justify-center pointer-events-none bg-white/5">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={160}
                  height={160}
                  className="object-cover w-full h-full"
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-ink-muted"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-neon-violet to-transparent"
        />
      </motion.div>
    </section>
  );
}
