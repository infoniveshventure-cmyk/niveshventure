"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Building, TrendingUp, Globe, Cpu, Briefcase } from "lucide-react";
import { PremiumTiltGlow } from "@/components/motion/PremiumTiltGlow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const VERTICALS = [
  {
    icon: Building,
    title: "Real Estate",
    description: "Diversified investments in high-value real estate assets across emerging markets for stable long-term growth.",
    color: "#7B5CFF",
    glow: "rgba(123,92,255,0.3)",
    gradient: "from-[#7B5CFF]/20 to-transparent",
  },
  {
    icon: TrendingUp,
    title: "IPO Investments",
    description: "Early access to high-potential Initial Public Offerings, giving you the edge in equity markets.",
    color: "#00E5FF",
    glow: "rgba(0,229,255,0.3)",
    gradient: "from-[#00E5FF]/20 to-transparent",
  },
  {
    icon: Globe,
    title: "Forex Trading",
    description: "Strategic currency pair trading with risk-managed algorithms delivering consistent returns.",
    color: "#00FFA3",
    glow: "rgba(0,255,163,0.3)",
    gradient: "from-[#00FFA3]/20 to-transparent",
  },
  {
    icon: Cpu,
    title: "Digital Assets",
    description: "Curated portfolio of cryptocurrencies and tokenized assets for next-generation wealth building.",
    color: "#FF3CAC",
    glow: "rgba(255,60,172,0.3)",
    gradient: "from-[#FF3CAC]/20 to-transparent",
  },
  {
    icon: Briefcase,
    title: "International Projects",
    description: "Cross-border business ventures and infrastructure projects delivering multi-market diversification.",
    color: "#FFD700",
    glow: "rgba(255,215,0,0.3)",
    gradient: "from-[#FFD700]/20 to-transparent",
  },
];

export default function BusinessSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} id="business" className="relative py-8 md:py-20 bg-[#050914]">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E1A] via-[#050914] to-[#0A0E1A] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Section header */}
        <RevealOnScroll className="text-center mb-6 md:mb-12">
          <p className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2">
            Business Verticals
          </p>
          <h2 className="text-lg md:text-3xl xl:text-4xl font-display font-bold text-white">
            Where Your Money <span className="gradient-text">Works Harder</span>
          </h2>
          <p className="text-white mt-2 md:mt-3 max-w-xl mx-auto text-xs md:text-base">
            Five carefully curated investment categories managed by experienced professionals
          </p>
        </RevealOnScroll>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {VERTICALS.slice(0, 3).map((v, i) => {
            const Icon = v.icon;
            return (
              <RevealOnScroll
                key={v.title}
                delay={i * 0.1}
                variant="scaleUp"
                className="h-full"
              >
                <ScrollMouseInteractive isInView={isInView} depth={i % 2 === 0 ? "front" : "middle"} maxTranslateY={20} maxTilt={10} className="h-full">
                  <PremiumTiltGlow
                    glowColor={v.glow}
                    className="landing-card p-4 md:p-7 h-full cursor-default"
                    maxTilt={8}
                  >
                    {/* Top gradient */}
                    <div
                      className="absolute inset-x-0 top-0 h-1 rounded-t-[1.25rem] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(to right, ${v.color}, transparent)` }}
                    />

                    {/* Icon */}
                    <div
                      className="w-10 md:w-14 h-10 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center mb-3 md:mb-6"
                      style={{ background: `${v.color}18`, boxShadow: `0 0 20px ${v.glow}` }}
                    >
                      <Icon size={20} className="md:w-[26px] md:h-[26px]" style={{ color: v.color }} />
                    </div>

                    <h3 className="text-base md:text-xl font-display font-bold text-white mb-2 md:mb-3">{v.title}</h3>
                    <p className="text-white text-xs md:text-sm leading-relaxed">{v.description}</p>

                    {/* Bottom accent */}
                    <div
                      className="mt-6 h-0.5 w-12 rounded-full"
                      style={{ background: `linear-gradient(to right, ${v.color}, transparent)` }}
                    />
                  </PremiumTiltGlow>
                </ScrollMouseInteractive>
              </RevealOnScroll>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6 max-w-2xl lg:max-w-none mx-auto lg:mx-0 lg:px-24 xl:px-40">
          {VERTICALS.slice(3).map((v, i) => {
            const Icon = v.icon;
            return (
              <RevealOnScroll
                key={v.title}
                delay={(i + 3) * 0.1}
                variant="scaleUp"
                className="h-full"
              >
                <ScrollMouseInteractive isInView={isInView} depth="front" maxTranslateY={20} maxTilt={10} className="h-full">
                  <PremiumTiltGlow
                    glowColor={v.glow}
                    className="landing-card p-7 h-full cursor-default"
                    maxTilt={8}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: `${v.color}18`, boxShadow: `0 0 20px ${v.glow}` }}
                    >
                      <Icon size={26} style={{ color: v.color }} />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-3">{v.title}</h3>
                    <p className="text-white text-sm leading-relaxed">{v.description}</p>
                    <div
                      className="mt-6 h-0.5 w-12 rounded-full"
                      style={{ background: `linear-gradient(to right, ${v.color}, transparent)` }}
                    />
                  </PremiumTiltGlow>
                </ScrollMouseInteractive>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
