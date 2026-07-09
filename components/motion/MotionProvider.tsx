"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface MotionContextType {
  isLowEnd: boolean;
  isTouchDevice: boolean;
  reducedMotion: boolean;
  springs: {
    default: { stiffness: number; damping: number; mass: number };
    gentle: { stiffness: number; damping: number; mass: number };
    bouncy: { stiffness: number; damping: number; mass: number };
    slow: { stiffness: number; damping: number; mass: number };
  };
}

const MotionContext = createContext<MotionContextType>({
  isLowEnd: false,
  isTouchDevice: false,
  reducedMotion: false,
  springs: {
    default: { stiffness: 100, damping: 15, mass: 1 },
    gentle: { stiffness: 60, damping: 20, mass: 1 },
    bouncy: { stiffness: 150, damping: 10, mass: 1 },
    slow: { stiffness: 30, damping: 15, mass: 1 },
  },
});

export const useMotion = () => useContext(MotionContext);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // 1. Detect touch device
    const touch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(touch);

    // 2. Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    // 3. Detect low-end performance device
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 8;

    const isLow = cores < 4 || memory < 4 || mediaQuery.matches;
    setIsLowEnd(isLow);

    // 4. Global cursor position tracking for moving gradients
    const handleMouseMove = (e: MouseEvent) => {
      if (touch) return;
      const xPercent = (e.clientX / window.innerWidth) * 100;
      const yPercent = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mouse-x", `${xPercent}%`);
      document.documentElement.style.setProperty("--mouse-y", `${yPercent}%`);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const springs = {
    default: { stiffness: 100, damping: 15, mass: 1 },
    gentle: { stiffness: 60, damping: 20, mass: 1 },
    bouncy: { stiffness: 150, damping: 10, mass: 1 },
    slow: { stiffness: 30, damping: 15, mass: 1 },
  };

  return (
    <MotionContext.Provider value={{ isLowEnd, isTouchDevice, reducedMotion, springs }}>
      {children}
    </MotionContext.Provider>
  );
}
