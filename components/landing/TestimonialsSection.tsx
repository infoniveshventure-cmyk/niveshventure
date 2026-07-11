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
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} className="relative py-12 md:py-28 bg-transparent overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-violet/3 to-transparent pointer-events-none" />

      {/* Marquee CSS Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes testimonials-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .testimonials-marquee-track {
          display: flex;
          gap: 1.5rem;
          width: max-content;
          animation: testimonials-marquee 45s linear infinite;
        }
        .testimonials-marquee-track:hover {
          animation-play-state: paused;
        }
      `}} />

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-medium text-neon-cyan tracking-widest uppercase mb-3">
            Community Voice
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white">
            What Our <span className="gradient-text">Members Say</span>
          </h2>
        </div>

        {/* Marquee Track Container */}
        <div className="relative overflow-hidden w-full py-4">
          {/* Shadow overlays for smooth edge fading */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0D0D1A] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0D0D1A] to-transparent z-10 pointer-events-none" />

          <div className="testimonials-marquee-track">
            {/* Loop testimonials twice for seamless scroll */}
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
              <div 
                key={idx} 
                className="landing-card p-6 md:p-8 flex flex-col gap-5 w-[290px] md:w-[360px] flex-shrink-0"
                style={{
                  background: "rgba(18, 14, 38, 0.6)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
                }}
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={13} className="text-[#FFD700] fill-[#FFD700]" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-white text-xs md:text-sm leading-relaxed flex-1 italic opacity-90">
                  "{t.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-xs md:text-sm">{t.name}</p>
                    <p className="text-[10px] text-white/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </section>
  );
}
