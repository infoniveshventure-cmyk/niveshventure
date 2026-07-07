"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "Business", href: "#business" },
  { label: "Income", href: "#income" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock/unlock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${scrolled
        ? "bg-[#0A0E1A]/90 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
        : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between gap-3">
        {/* Mobile menu toggle (shown below md) - LEFT */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white p-1.5 hover:bg-white/10 rounded-lg transition flex-shrink-0"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 md:gap-3 group flex-shrink-0 md:flex-1">
          <div className="w-8 md:w-10 h-8 md:h-10 rounded-lg md:rounded-xl bg-[#0d1831] border border-white/10 flex items-center justify-center group-hover:border-neon-violet/50 transition-all duration-300 shadow-neon-sm">
            <Image src="/logo1.png" alt="Nivesh Ventures" width={24} height={24} className="object-contain md:w-[30px] md:h-[30px]" />
          </div>
          <div className="flex items-baseline gap-0.5 md:gap-1">
            <span className="font-display font-bold text-xs md:text-base tracking-[0.12em] text-white">NIVESH</span>
            <span className="font-display font-bold text-xs md:text-base tracking-[0.12em] text-neon-cyan">VENTURES</span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative text-base font-medium text-ink-muted hover:text-white transition-colors duration-200 group py-1"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-neon-violet to-neon-cyan group-hover:w-full transition-all duration-350 rounded-full" />
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex lg:flex items-center gap-2 md:gap-3 flex-shrink-0">
          <Link
            href="/login"
            className="btn-landing-ghost !text-white hover:!text-white !py-1.5 md:!py-2.5 !px-3 md:!px-5 !text-sm md:!text-base !rounded-lg md:!rounded-xl"
          >
            Login
          </Link>
          <Link href="/register" className="btn-landing-primary !py-1.5 md:!py-2.5 !px-3 md:!px-5 !text-sm md:!text-base !rounded-lg md:!rounded-xl landing-glow-pulse">
            Get Started
          </Link>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Side drawer for mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-64 z-50 bg-[#0A0E1A] border-r border-white/10 flex flex-col md:hidden overflow-y-auto"
          >
            {/* Header with close button */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
              <span className="font-display font-bold text-sm tracking-wide text-white">MENU</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-1 hover:bg-white/10 rounded-lg transition"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-ink-muted hover:text-white hover:bg-white/5 transition-colors py-2.5 px-3 rounded-lg"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA Buttons at bottom */}
            <div className="px-4 py-4 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/login"
                className="btn-landing-ghost text-white !py-2 !px-4 !text-sm !rounded-lg text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-landing-primary !py-2 !px-4 !text-sm !rounded-lg text-center landing-glow-pulse"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
