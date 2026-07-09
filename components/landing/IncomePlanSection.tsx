"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Users, GitMerge, Layers, Zap, Award } from "lucide-react";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const INCOMES = [
  {
    icon: Users,
    title: "Direct Referral",
    rate: "10%",
    description:
      "Earn 10% instantly every time someone joins the platform through your referral link.",
    color: "#edecf2ff",
    bg: "from-[#7B5CFF]/15 to-transparent",
    glow: "rgba(245, 244, 249, 1)",
  },
  {
    icon: GitMerge,
    title: "Binary Matching",
    rate: "10%",
    description:
      "10% matching commission on the weaker leg of your binary tree, calculated monthly.",
    color: "#00E5FF",
    bg: "from-[#00E5FF]/15 to-transparent",
    glow: "rgba(0,229,255,0.25)",
  },
  {
    icon: Layers,
    title: "Level Income",
    rate: "5%",
    description:
      "Earn 5% on the monthly returns of your downline team members across multiple levels.",
    color: "#00FFA3",
    bg: "from-[#00FFA3]/15 to-transparent",
    glow: "rgba(0,255,163,0.25)",
  },
  {
    icon: Zap,
    title: "Booster Income",
    rate: "1.5%",
    description:
      "Qualify for booster multipliers by referring 2 members within 7 days of activation.",
    color: "#FF3CAC",
    bg: "from-[#FF3CAC]/15 to-transparent",
    glow: "rgba(255,60,172,0.25)",
  },
  {
    icon: Award,
    title: "Rank Rewards",
    rate: "Up to $10K",
    description:
      "Unlock milestone cash rewards and luxury prizes as you climb from Bronze to Crown rank.",
    color: "#FFD700",
    bg: "from-[#FFD700]/15 to-transparent",
    glow: "rgba(255,215,0,0.25)",
  },
];

export default function IncomePlanSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, {
    margin: "-10% 0px -10% 0px",
  });

  return (
    <section
      ref={sectionRef}
      id="income"
      className="relative py-8 md:py-20 bg-[#050914] overflow-hidden"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />

      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-neon-violet/5 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-neon-cyan/5 blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12">

        {/* Header */}
        <div className="text-center mb-6 md:mb-12">

          <p className="text-xs font-medium text-neon-green tracking-widest uppercase mb-2">
            Multiple Income Streams
          </p>

          <h2 className="text-lg md:text-3xl xl:text-4xl font-display font-bold !text-white">
            Five Ways to{" "}
            <span className="gradient-text">
              Earn Daily
            </span>
          </h2>

          <p className="!text-white mt-2 md:mt-3 max-w-2xl mx-auto text-xs md:text-base">
            A diversified income architecture ensures you earn from multiple
            sources simultaneously, maximizing your wealth-building velocity.
          </p>

        </div>


        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">

          {INCOMES.map((income, i) => {

            const Icon = income.icon;

            return (
              <ScrollMouseInteractive
                key={income.title}
                isInView={isInView}
                depth={i % 2 === 0 ? "front" : "middle"}
                maxTranslateY={35}
                maxTilt={15}
                className="h-full"
              >

                <div className="landing-card p-3 md:p-6 flex flex-col group cursor-default h-full">

                  {/* Rate */}
                  <div
                    className="self-end mb-3 md:mb-5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-bold"
                    style={{
                      color: income.color,
                      background: `${income.color}18`,
                      border: `1px solid ${income.color}30`,
                    }}
                  >
                    {income.rate}
                  </div>


                  {/* Icon */}
                  <div
                    className="w-10 md:w-12 h-10 md:h-12 rounded-lg md:rounded-2xl flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 transition-transform duration-300"
                    style={{
                      background: `${income.color}18`,
                      boxShadow: `0 0 16px ${income.glow}`,
                    }}
                  >
                    <Icon
                      size={18}
                      className="md:w-[22px] md:h-[22px]"
                      style={{
                        color: income.color,
                      }}
                    />
                  </div>


                  <h3 className="!text-white font-display font-bold text-sm md:text-base mb-2 md:mb-3">
                    {income.title}
                  </h3>


                  <p className="!text-white text-xs leading-relaxed flex-1">
                    {income.description}
                  </p>


                  {/* Glow line */}
                  <div
                    className="mt-5 h-0.5 w-0 rounded-full group-hover:w-full transition-all duration-500"
                    style={{
                      background: `linear-gradient(to right, ${income.color}, transparent)`,
                    }}
                  />

                </div>

              </ScrollMouseInteractive>
            );
          })}

        </div>


        {/* CTA */}
        <div className="text-center mt-14">

          <p className="!text-white mb-6">
            Ready to activate all 5 income streams?
          </p>

          <a
            href="/register"
            className="btn-landing-primary inline-flex items-center gap-2 landing-glow-pulse"
          >
            Start Earning Today →
          </a>

        </div>

      </div>

    </section>
  );
}