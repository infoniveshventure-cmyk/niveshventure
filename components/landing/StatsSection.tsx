"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Users, TrendingUp, Globe, Award, Percent, Handshake } from "lucide-react";
import { CountUpNumber } from "@/components/motion/CountUpNumber";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const STATS = [
  { icon: Globe, label: "Countries", value: 7, display: "7+", suffix: "+", color: "text-neon-green", bg: "bg-neon-green/15" },
  { icon: Users, label: "Total Members", value: 10, display: "10K+", suffix: "K+", color: "text-neon-violet", bg: "bg-neon-violet/15" },
  { icon: Users, label: "Active Members", value: 8.5, decimals: 1, display: "8.5K+ (85%)", suffix: "K+ (85%)", color: "text-neon-violet", bg: "bg-neon-violet/15" },
  { icon: TrendingUp, label: "Global Volume", value: 2, display: "$2M+", prefix: "$", suffix: "M+", color: "text-neon-cyan", bg: "bg-neon-cyan/15" },
  { icon: Percent, label: "Success Rate", value: 98, display: "98%", suffix: "%", color: "text-neon-green", bg: "bg-neon-green/15" },
  { icon: Handshake, label: "Partners", value: 100, display: "100+", suffix: "+", color: "text-neon-cyan", bg: "bg-neon-cyan/15" },
  { icon: Award, label: "Monthly Growth", value: 9.8, decimals: 1, display: "9.8%", suffix: "%", color: "text-neon-magenta", bg: "bg-neon-magenta/15" },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} id="stats" className="relative py-8 md:py-20 bg-transparent">
      {/* Divider glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <RevealOnScroll className="text-center mb-6 md:mb-12">
          <p className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2">By the Numbers</p>
          <h2 className="text-lg md:text-3xl font-display font-bold !text-white">Trusted by Thousands Globally</h2>
        </RevealOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <RevealOnScroll
                key={stat.label}
                delay={i * 0.05}
                variant="scaleUp"
                className="h-full"
              >
                <ScrollMouseInteractive isInView={isInView} depth={i % 2 === 0 ? "front" : "middle"} maxTranslateY={15} maxTilt={8} className="h-full">
                  <div className="landing-card p-3 md:p-4 text-center group h-full flex flex-col justify-between">
                    <div>
                      <div className={`w-8 md:w-10 h-8 md:h-10 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={14} className={`${stat.color} md:w-[18px] md:h-[18px]`} />
                      </div>

                      <div className="font-display font-bold text-lg md:text-2xl !text-white tabular-nums">
                        <CountUpNumber
                          value={stat.value}
                          prefix={stat.prefix || ""}
                          suffix={stat.suffix || ""}
                          decimals={stat.decimals || 0}
                          duration={1500}
                        />
                      </div>
                    </div>

                    <div className="text-xs md:text-xs !text-white mt-1 md:mt-2 opacity-80">{stat.label}</div>
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
