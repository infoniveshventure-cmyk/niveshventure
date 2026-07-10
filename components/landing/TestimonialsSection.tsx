"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useInView, motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const TESTIMONIALS = [
  {
    name: "Arjun Sharma",
    role: "Senior Investor · Gold Rank",
    initials: "AS",
    color: "#7B5CFF",
    rating: 5,
    quote: "Nivesh Ventures transformed my financial journey. The matching income system is genuinely transparent and the returns have been consistent for 8 months.",
  },
  {
    name: "Priya Mehta",
    role: "Business Builder · Diamond Rank",
    initials: "PM",
    color: "#00E5FF",
    rating: 5,
    quote: "The booster income system is brilliant. Within 7 days of joining I referred two friends and unlocked accelerated ROI. This is the smartest investment I've made.",
  },
  {
    name: "Rahul Verma",
    role: "Community Leader · Crown Rank",
    initials: "RV",
    color: "#FFD700",
    rating: 5,
    quote: "From Bronze to Crown in 14 months. The binary tree system rewards genuine community building. My team of 1,200+ members earns together every month.",
  },
  {
    name: "Sunita Patel",
    role: "Portfolio Investor · Silver Rank",
    initials: "SP",
    color: "#00FFA3",
    rating: 5,
    quote: "I was skeptical at first, but the transparent dashboard showing every transaction and income calculation convinced me. The monthly closing system is incredibly well-designed.",
  },
  {
    name: "Vikram Singh",
    role: "Wealth Builder · Gold Rank",
    initials: "VS",
    color: "#FF3CAC",
    rating: 5,
    quote: "Three income streams active daily. The referral, level, and matching incomes have created a reliable passive income that supplements my main job significantly.",
  },
  {
    name: "Nisha Gupta",
    role: "Financial Planner · Diamond Rank",
    initials: "NG",
    color: "#7B5CFF",
    rating: 5,
    quote: "The platform's 5 business verticals give me confidence that my investment is diversified. Real estate + digital assets + forex — smart allocation for long-term growth.",
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  const next = useCallback(() => setCurrent((c) => (c + 1) % TESTIMONIALS.length), []);
  const prev = () => setCurrent((c) => (c - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, paused]);

  const visibleIndices = [
    (current) % TESTIMONIALS.length,
    (current + 1) % TESTIMONIALS.length,
    (current + 2) % TESTIMONIALS.length,
  ];

  return (
    <section ref={sectionRef} className="relative py-12 md:py-28 bg-transparent overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-violet/3 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-sm font-medium text-neon-cyan tracking-widest uppercase mb-3">
            Community Voice
          </p>
          <h2 className="text-4xl xl:text-5xl font-display font-bold text-white">
            What Our <span className="gradient-text">Members Say</span>
          </h2>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="grid lg:grid-cols-3 gap-6 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {visibleIndices.map((idx, pos) => {
                const t = TESTIMONIALS[idx];
                return (
                  <ScrollMouseInteractive key={`${idx}-${pos}`} isInView={isInView} depth={pos === 1 ? "front" : "middle"} maxTranslateY={35} maxTilt={15}>
                    <div className="landing-card p-8 flex flex-col gap-5 h-full">
                      {/* Stars */}
                      <div className="flex gap-1">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} size={14} className="text-[#FFD700] fill-[#FFD700]" />
                        ))}
                      </div>

                      {/* Quote */}
                      <p className="text-white text-sm leading-relaxed flex-1 italic">
                        "{t.quote}"
                      </p>

                      {/* Author */}
                      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}
                        >
                          {t.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{t.name}</p>
                          <p className="text-[11px] text-white">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollMouseInteractive>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:text-white hover:border-neon-violet/50 transition-all duration-200"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-6 bg-neon-violet" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:text-white hover:border-neon-violet/50 transition-all duration-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
