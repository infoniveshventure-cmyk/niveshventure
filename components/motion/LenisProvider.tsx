"use client";

import React from "react";
import { ReactLenis } from "lenis/react";
import { useMotion } from "./MotionProvider";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const { reducedMotion, isLowEnd } = useMotion();

  // If user prefers reduced motion, we disable Lenis
  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        duration: isLowEnd ? 0.8 : 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
      }}
    >
      {children}
    </ReactLenis>
  );
}
