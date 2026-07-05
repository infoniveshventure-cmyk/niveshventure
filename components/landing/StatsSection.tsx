"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Globe, Award } from "lucide-react";

const STATS = [
  { icon: Users, label: "Active Members", value: 50000, display: "50,000+", color: "text-neon-violet", bg: "bg-neon-violet/15" },
  { icon: TrendingUp, label: "Total Volume", value: 5, display: "$5M+", suffix: "M", color: "text-neon-cyan", bg: "bg-neon-cyan/15" },
  { icon: Globe, label: "Countries", value: 50, display: "50+", color: "text-neon-green", bg: "bg-neon-green/15" },
  { icon: Award, label: "Monthly Returns", value: 30, display: "30%", suffix: "%", color: "text-neon-magenta", bg: "bg-neon-magenta/15" },
];

function AnimatedCounter({ end, suffix = "", duration = 2200 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(end);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} className="font-display font-bold text-xl md:text-3xl text-white tabular-nums">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export default function StatsSection() {
  return (
    <section id="about" className="relative py-8 md:py-20 bg-[#0A0E1A]">
      {/* Divider glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 md:mb-12"
        >
          <p className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2">By the Numbers</p>
          <h2 className="text-lg md:text-3xl font-display font-bold text-white">Trusted by Thousands Globally</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="landing-card p-3 md:p-6 text-center group"
              >
                <div className={`w-8 md:w-12 h-8 md:h-12 rounded-lg md:rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={16} className={`${stat.color} md:w-[22px] md:h-[22px]`} />
                </div>
                <AnimatedCounter end={stat.value} suffix={stat.display.replace(stat.value.toString(), "").replace("$", "")} />
                <div className="text-xs md:text-xs text-ink-muted mt-1 md:mt-2">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
