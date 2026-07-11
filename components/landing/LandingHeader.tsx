"use client";
import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useChatbot } from "@/lib/ChatbotContext";

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "Markets", href: "#markets" },
  { label: "Predict & Earn", href: "#prediction-arena" },
  { label: "Stats", href: "#stats" },
  { label: "Opportunity", href: "#opportunity" },
  { label: "Rewards", href: "#rewards" },
  { label: "FAQs", href: "#faq" },
];

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#hero");
  const { setOpen } = useChatbot();

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        setActiveHash(window.location.hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleAskAi = () => {
    setOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-7xl transition-all duration-300">
      {/* Glass Capsule Main Bar */}
      <div
        className="rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.15)] px-4 md:px-6 lg:px-8 py-2 md:py-2.5 flex items-center justify-between gap-3"
      >
        {/* Mobile menu toggle (shown below md) - LEFT */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white p-1.5 hover:bg-white/10 rounded-full transition flex-shrink-0"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#0d1831] border border-white/10 flex items-center justify-center group-hover:border-neon-violet/50 transition-all duration-300 shadow-neon-sm">
            <Image src="/logo1.png" alt="Nivesh Ventures" width={18} height={18} className="object-contain" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-bold text-xs md:text-sm tracking-[0.12em] text-white">NIVESH</span>
            <span className="font-display font-bold text-xs md:text-sm tracking-[0.12em] text-neon-cyan">VENTURES</span>
          </div>
        </a>

        {/* Desktop Nav Links (Glassy Pill Active State style) */}
        <nav className="hidden md:flex items-center gap-1.5 bg-black/20 p-1 rounded-full border border-white/5">
          {navLinks.map((link) => {
            const isActive = activeHash === link.href;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setActiveHash(link.href)}
                className={`relative text-xs font-medium px-4 py-1.5 rounded-full transition-all duration-250 ${isActive
                  ? "text-white bg-white/10 border border-white/10 shadow-[0_2px_8px_rgba(255,255,255,0.05)]"
                  : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">


          <button
            type="button"
            onClick={handleAskAi}
            className="group relative overflow-hidden rounded-full md:hidden"
          >
            {/* Animated Glow */}
            <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-70 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:blur-lg animate-pulse" />

            {/* Glass Button */}
            <div
              className="
      relative
      flex items-center gap-2
      rounded-full
      border border-white/10
      bg-white/[0.08]
      backdrop-blur-2xl
      px-2 md:px-2.5
      py-2
      shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.12)]
      transition-all
      duration-300
      group-hover:scale-105
      group-hover:bg-white/[0.12]
    "
            >
              {/* Animated Icon */}
              <Sparkles
                size={16}
                className="text-cyan-300 transition-all duration-300 group-hover:rotate-12 group-hover:scale-125"
              />

              {/* Gradient Text */}
              <span
                className="
        font-semibold
        text-xs md:text-sm
        bg-gradient-to-r
        from-cyan-300
        via-violet-300
        to-pink-300
        bg-clip-text
        text-transparent
      "
              >
                Ask AI
              </span>

              {/* Small Animated Dot */}
              {/* <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse" /> */}
            </div>
          </button>
          <Link
            href="/login"
            className="hidden lg:inline-flex items-center text-xs md:text-sm font-medium text-white/80 hover:text-white px-3 md:px-4 py-1.5 rounded-full hover:bg-white/5 transition-all flex-shrink-0"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="hidden md:inline-block bg-white text-[#0D0D1A] font-semibold text-xs md:text-sm px-4 md:px-5 py-1.5 md:py-2 rounded-full hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Floating Glass Dropdown Menu for Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop click closer */}
            <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute top-[110%] left-0 z-40 p-2.5 rounded-2xl border border-white/15 bg-[#0D0D1A]/95 backdrop-blur-2xl flex flex-col gap-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] md:hidden w-fit min-w-[150px]"
            >
              {/* Nav Links */}
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = activeHash === link.href;
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => {
                        setActiveHash(link.href);
                        setMobileMenuOpen(false);
                      }}
                      className={`text-xs py-2 px-3.5 rounded-full transition-all ${isActive
                        ? "text-white bg-white/10 font-semibold border border-white/10"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      {link.label}
                    </a>
                  );
                })}
                <hr className="border-white/10 my-1" />
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs py-2 px-3.5 rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-all"
                >
                  Login
                </Link>
                {/* <button
                  type="button"
                  onClick={handleAskAi}
                  className="text-left text-xs py-2 px-3.5 rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-all"
                >
                  Ask AI
                </button> */}
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs py-2 px-3.5 rounded-full text-neon-cyan hover:bg-white/5 transition-all font-semibold"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
