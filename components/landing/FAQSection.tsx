"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How do I register on Nivesh Ventures?",
    a: "Visit our registration page, enter your full name, mobile number, and Gmail address. Verify your email via OTP, select your position in the binary tree (Left/Right), and submit. You'll receive a welcome email with your Member ID, Login Key, and Access Key.",
  },
  {
    q: "What is the Premium $30 membership plan?",
    a: "The $30 Premium activation unlocks all MLM income streams including Referral, Matching, Level, and Reward incomes. Free PIN activation gives you dashboard access but not income eligibility. Premium members are also eligible for the Booster income and Rank Reward program.",
  },
  {
    q: "How does Binary Matching Income work?",
    a: "Matching income is calculated at 10% of the weaker leg's monthly business volume. If your left leg generates $5,000 and your right leg generates $3,000, you earn 10% of $3,000 = $300. The remaining $2,000 from the stronger leg carries forward to next month.",
  },
  {
    q: "What wallets does the platform offer?",
    a: "The platform has 7 distinct wallets: USDT Wallet (deposits/withdrawals), Referral Wallet, Matching Wallet, Returns Wallet, Returns Level Wallet, Booster Wallet, and Rewards Wallet. Each income type credits to its corresponding wallet for transparent tracking.",
  },
  {
    q: "How does Booster Income work?",
    a: "If you refer 2 new premium members within 7 days of your own activation, you qualify for Booster speed-up. This multiplier increases your monthly ROI percentage yields. The booster remains active as long as you maintain qualifying referral activity.",
  },
  {
    q: "What is Monthly Closing?",
    a: "On the last day of each month, the system calculates all commissions, releases income to respective wallets, resets monthly volumes, and carries forward unmatched binary volumes. This transparent monthly cycle ensures all earnings are computed fairly.",
  },
  {
    q: "How do I withdraw my earnings?",
    a: "Navigate to the Withdrawal section, select the wallet you want to withdraw from, enter the amount (minimum $10), and submit. Withdrawals are processed within 24–72 hours to your USDT wallet. Ensure your KYC is verified for faster processing.",
  },
  {
    q: "What ranks are available and what are the rewards?",
    a: "There are 5 ranks: Bronze (0–49 team), Silver (50–199 team, $250 reward), Gold (200–499 team, $1,000 reward), Diamond (500–999 team, $5,000 + Luxury Trip), and Crown (1,000+ team, $10,000 + Brand New Car). Ranks are evaluated monthly.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-8 md:py-20 bg-[#050914]">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="text-center mb-6 md:mb-12">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2"
          >
            Frequently Asked
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-lg md:text-3xl xl:text-4xl font-display font-bold text-white"
          >
            Got{" "}
            <span className="gradient-text">Questions?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-ink-muted mt-2 md:mt-3 text-xs md:text-base"
          >
            Everything you need to know about the platform
          </motion.p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`landing-card overflow-hidden transition-all duration-300 ${
                  isOpen ? "border-neon-violet/40" : ""
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full px-7 py-5 flex items-center justify-between text-left gap-4"
                >
                  <span className={`font-medium text-base transition-colors duration-200 ${isOpen ? "text-neon-cyan" : "text-white"}`}>
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown
                      size={18}
                      className={`transition-colors duration-200 ${isOpen ? "text-neon-cyan" : "text-ink-muted"}`}
                    />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-7 pb-6">
                        <div className="h-px bg-gradient-to-r from-neon-violet/30 to-transparent mb-4" />
                        <p className="text-ink-muted text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-14"
        >
          <p className="text-ink-muted mb-5">Still have questions? Our AI assistant is ready 24/7.</p>
          <p className="text-sm text-ink-muted">Click the chat icon in the bottom-right corner →</p>
        </motion.div>
      </div>
    </section>
  );
}
