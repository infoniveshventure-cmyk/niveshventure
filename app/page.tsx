"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

// Desktop landing sections
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import StockMarketSection from "@/components/landing/StockMarketSection";
import PredictionSection from "@/components/landing/PredictionSection";
import StatsSection from "@/components/landing/StatsSection";
import BusinessSection from "@/components/landing/BusinessSection";
import DataVizSection from "@/components/landing/DataVizSection";
import TrustSection from "@/components/landing/TrustSection";
import RankRewardsSection from "@/components/landing/RankRewardsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import FooterSection from "@/components/landing/FooterSection";

export default function Home() {
  return (
    <div className="landing-page bg-transparent text-white w-full">
      {/* ─────────────────────────────────────────────────────
          RESPONSIVE LANDING PAGE
          Shows same design on all devices - fully responsive
          Mobile (< 768px): Stacked layouts, scaled fonts, optimized spacing
          Tablet/Desktop (768px+): Multi-column layouts, full animations
      ───────────────────────────────────────────────────── */}
      <LandingHeader />
      <HeroSection />
      <StockMarketSection />
      <PredictionSection />
      <StatsSection />
      <BusinessSection />
      <DataVizSection />
      <TrustSection />
      <RankRewardsSection />
      <TestimonialsSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}