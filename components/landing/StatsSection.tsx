"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Users, TrendingUp, Globe, Award } from "lucide-react";
import { CountUpNumber } from "@/components/motion/CountUpNumber";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const STATS = [
  { icon: Users, label: "Active Members", value: 50000, display: "50,000+", suffix: "+", color: "text-neon-violet", bg: "bg-neon-violet/15" },
  { icon: TrendingUp, label: "Total Volume", value: 5, display: "$5M+", prefix: "$", suffix: "M+", color: "text-neon-cyan", bg: "bg-neon-cyan/15" },
  { icon: Globe, label: "Countries", value: 50, display: "50+", suffix: "+", color: "text-neon-green", bg: "bg-neon-green/15" },
  { icon: Award, label: "Monthly Growth Yield", value: 6, display: "6%", suffix: "%", color: "text-neon-magenta", bg: "bg-neon-magenta/15" },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} id="about" className="relative py-8 md:py-20 bg-[#0A0E1A]">
      {/* Divider glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <RevealOnScroll className="text-center mb-6 md:mb-12">
          <p className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2">By the Numbers</p>
          <h2 className="text-lg md:text-3xl font-display font-bold !text-white">Trusted by Thousands Globally</h2>
        </RevealOnScroll>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <RevealOnScroll
                key={stat.label}
                delay={i * 0.1}
                variant="scaleUp"
                className="h-full"
              >
                <ScrollMouseInteractive isInView={isInView} depth={i % 2 === 0 ? "front" : "middle"} maxTranslateY={25} maxTilt={12} className="h-full">
                  <div className="landing-card p-3 md:p-6 text-center group h-full">
                    <div className={`w-8 md:w-12 h-8 md:h-12 rounded-lg md:rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={16} className={`${stat.color} md:w-[22px] md:h-[22px]`} />
                    </div>

                    <div className="font-display font-bold text-2xl md:text-4xl !text-white tabular-nums">
                      <CountUpNumber
                        value={stat.value}
                        prefix={stat.prefix || ""}
                        suffix={stat.suffix || ""}
                        duration={1500}
                      />
                    </div>

                    <div className="text-sm md:text-base !text-white mt-1 md:mt-2">{stat.label}</div>
                  </div>
                </ScrollMouseInteractive>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
