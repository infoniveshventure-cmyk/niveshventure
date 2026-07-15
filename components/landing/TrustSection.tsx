"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Shield, Eye, Target, Users, CheckCircle } from "lucide-react";
import { PremiumTiltGlow } from "@/components/motion/PremiumTiltGlow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const TRUST_PILLARS = [
  {
    icon: Shield,
    title: "Professional Management",
    description: "Our seasoned investment team brings 15+ years of collective experience across global financial markets, ensuring your capital is always in expert hands.",
    points: ["Certified financial advisors", "Risk-managed portfolios", "24/7 monitoring"],
    color: "#7B5CFF",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description: "Every transaction, income calculation, and commission payout is recorded on-chain and visible in your dashboard in real-time.",
    points: ["Real-time income tracking", "Verified transaction logs", "Monthly income reports"],
    color: "#00E5FF",
  },
  {
    icon: Target,
    title: "Long-term Vision",
    description: "We are building a decade-long financial ecosystem, not a short-term scheme. Our 11-month lock-in structure ensures sustainable returns.",
    points: ["11-month investment cycle", "Compound growth model", "Proven ROI structure"],
    color: "#00FFA3",
  },
  {
    icon: Users,
    title: "Community Growth",
    description: "Strength in numbers. Our binary tree structure rewards community builders, making every member's success tied to the collective growth.",
    points: ["10K+ active members", "Global community support", "Collaborative income model"],
    color: "#FF3CAC",
  },
];

export default function TrustSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} id="about" className="relative py-8 md:py-20 bg-transparent overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-magenta/30 to-transparent" />

      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-neon-violet/4 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Header */}
        <RevealOnScroll className="text-center mb-6 md:mb-12">
          <p className="text-xs md:text-xs font-medium text-neon-magenta tracking-widest uppercase mb-2 md:mb-2">
            Why Choose Us
          </p>
          <h2 className="text-lg md:text-3xl xl:text-4xl font-display font-bold text-white">
            Built on <span className="gradient-text">Trust & Integrity</span>
          </h2>
        </RevealOnScroll>

        {/* Trust pillars grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
          {TRUST_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <RevealOnScroll
                key={pillar.title}
                delay={i * 0.1}
                variant={i % 2 === 0 ? "slideRight" : "fadeIn"}
                className="h-full"
              >
                <ScrollMouseInteractive isInView={isInView} depth={i % 2 === 0 ? "front" : "middle"} maxTranslateY={20} maxTilt={10} className="h-full">
                  <PremiumTiltGlow
                    glowColor={`${pillar.color}20`}
                    className="landing-card p-8 flex gap-6 group h-full"
                    maxTilt={6}
                  >
                    {/* Left: Icon */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{ background: `${pillar.color}18`, boxShadow: `0 0 20px ${pillar.color}30` }}
                      >
                        <Icon size={26} style={{ color: pillar.color }} />
                      </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-white text-xl mb-3">{pillar.title}</h3>
                      <p className="text-white text-sm leading-relaxed mb-4">{pillar.description}</p>
                      <ul className="space-y-2">
                        {pillar.points.map((pt) => (
                          <li key={pt} className="flex items-center gap-2 text-sm text-white">
                            <CheckCircle size={14} style={{ color: pillar.color, flexShrink: 0 }} />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
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
