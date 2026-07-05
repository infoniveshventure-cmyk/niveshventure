"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Building, TrendingUp, Globe, Cpu, Briefcase } from "lucide-react";

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

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-80, 80], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-80, 80], [-8, 8]), { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`landing-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function BusinessSection() {
  return (
    <section id="business" className="relative py-8 md:py-20 bg-[#050914]">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E1A] via-[#050914] to-[#0A0E1A] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Section header */}
        <div className="text-center mb-6 md:mb-12">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2"
          >
            Business Verticals
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-lg md:text-3xl xl:text-4xl font-display font-bold text-white"
          >
            Where Your Money{" "}
            <span className="gradient-text">Works Harder</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-ink-muted mt-2 md:mt-3 max-w-xl mx-auto text-xs md:text-base"
          >
            Five carefully curated investment categories managed by experienced professionals
          </motion.p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {VERTICALS.slice(0, 3).map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
              >
                <TiltCard className="p-4 md:p-7 h-full cursor-default">
                  {/* Top gradient */}
                  <div className={`absolute inset-x-0 top-0 h-1 rounded-t-[1.25rem] bg-gradient-to-r ${v.gradient.replace("to-transparent", "to-transparent")} opacity-0 group-hover:opacity-100`}
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
                  <p className="text-ink-muted text-xs md:text-sm leading-relaxed">{v.description}</p>

                  {/* Bottom accent */}
                  <div
                    className="mt-6 h-0.5 w-12 rounded-full"
                    style={{ background: `linear-gradient(to right, ${v.color}, transparent)` }}
                  />
                </TiltCard>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6 max-w-2xl lg:max-w-none mx-auto lg:mx-0 lg:px-24 xl:px-40">
          {VERTICALS.slice(3).map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.36 + i * 0.12 }}
              >
                <TiltCard className="p-7 h-full cursor-default">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: `${v.color}18`, boxShadow: `0 0 20px ${v.glow}` }}
                  >
                    <Icon size={26} style={{ color: v.color }} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-3">{v.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">{v.description}</p>
                  <div
                    className="mt-6 h-0.5 w-12 rounded-full"
                    style={{ background: `linear-gradient(to right, ${v.color}, transparent)` }}
                  />
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
