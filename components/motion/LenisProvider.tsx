"use client";

import React from "react";
import { ReactLenis } from "lenis/react";
import { useMotion } from "./MotionProvider";
import { usePathname } from "next/navigation";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const { reducedMotion, isLowEnd } = useMotion();
  const pathname = usePathname();

  // Enable Lenis smooth scrolling only on the landing page (/)
  const isLandingPage = pathname === "/";

  if (reducedMotion || !isLandingPage) {
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
