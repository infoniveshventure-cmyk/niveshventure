"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Send, Globe, Share2, ExternalLink } from "lucide-react";

const NAV_COLS = [
  {
    title: "Platform",
    links: [
      { label: "About Us", href: "#about" },
      { label: "Business Verticals", href: "#business" },
      { label: "Income Plan", href: "#income" },
      { label: "Rank Rewards", href: "#" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { label: "Register", href: "/register" },
      { label: "Login", href: "/login" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Invest", href: "/invest" },
      { label: "Withdrawal", href: "/withdrawal" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", href: "#contact" },
      { label: "Help Center", href: "#faq" },
      { label: "Community", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: Share2, label: "Twitter / X", href: "#" },
  { icon: Send, label: "Telegram", href: "#" },
  { icon: Globe, label: "Website", href: "#" },
  { icon: ExternalLink, label: "LinkedIn", href: "#" },
];

export default function FooterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  }

  return (
    <footer id="contact" className="relative bg-[#030508] pt-20 pb-8 overflow-hidden">
      {/* Top gradient border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/50 to-transparent" />

      {/* Background glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-neon-violet/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-8 lg:px-12">
        {/* Main grid */}
        <div className="grid lg:grid-cols-5 gap-12 pb-16 border-b border-white/5">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0d1831] border border-white/10 flex items-center justify-center">
                <Image src="/logo.png" alt="Nivesh Ventures" width={30} height={30} className="object-contain" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-base tracking-[0.12em] text-white">NIVESH</span>
                <span className="font-display font-bold text-base tracking-[0.12em] text-neon-cyan">VENTURES</span>
              </div>
            </div>

            <p className="text-ink-muted text-sm leading-relaxed max-w-xs">
              Building the future of financial freedom through transparent investments, 
              community growth, and multiple income streams for everyone.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-ink-muted hover:text-white hover:border-neon-violet/40 hover:bg-neon-violet/10 transition-all duration-200"
                  >
                    <Icon size={15} />
                  </a>
                );
              })}
            </div>

            {/* Newsletter */}
            <div>
              <p className="text-sm font-medium text-white mb-3">Stay Updated</p>
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-neon-green text-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center">✓</span>
                  You're subscribed!
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-ink-muted focus:outline-none focus:border-neon-violet/50 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-violet to-neon-cyan text-white text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-bold text-white text-sm mb-5 tracking-wide">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-muted hover:text-white transition-colors duration-200 relative group"
                    >
                      <span className="group-hover:text-neon-cyan transition-colors">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} Nivesh Ventures. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-muted">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="w-px h-3 bg-white/10" />
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <span className="w-px h-3 bg-white/10" />
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
