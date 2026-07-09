"use client";

import { useEffect } from "react";
import { useMotionValue, useScroll, useSpring, useVelocity } from "framer-motion";

export function useInteractiveMotion() {
  // 1. Mouse positioning coordinates (normalized to -0.5 to 0.5 for easy tilt math)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 2. Smooth mouse springs
  const mouseXSpring = useSpring(mouseX, { stiffness: 45, damping: 20 });
  const mouseYSpring = useSpring(mouseY, { stiffness: 45, damping: 20 });

  // 3. Scroll tracking
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  // 4. Smooth scroll springs
  const scrollYSpring = useSpring(scrollY, { stiffness: 50, damping: 22 });
  const scrollVelocitySpring = useSpring(scrollVelocity, { stiffness: 60, damping: 24 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates to -0.5 to 0.5 relative to screen center
      const xNorm = e.clientX / window.innerWidth - 0.5;
      const yNorm = e.clientY / window.innerHeight - 0.5;
      
      mouseX.set(xNorm);
      mouseY.set(yNorm);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return {
    mouseX: mouseXSpring,
    mouseY: mouseYSpring,
    scrollY: scrollYSpring,
    scrollVelocity: scrollVelocitySpring,
  };
}
