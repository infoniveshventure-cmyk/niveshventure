"use client";

import React, { useRef } from "react";
import { motion, useTransform, useScroll, useSpring, useVelocity, useMotionValue } from "framer-motion";

interface ScrollMouseInteractiveProps {
  children: React.ReactNode;
  isInView: boolean;
  depth?: "front" | "middle" | "back";
  className?: string;
  maxTilt?: number;
  maxTranslateY?: number;
}

export function ScrollMouseInteractive({
  children,
  isInView,
  depth = "middle",
  className = "",
  maxTilt = 25,
  maxTranslateY = 60,
}: ScrollMouseInteractiveProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Raw Framer Motion values
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 2. High responsiveness springs for fast snaps
  const springX = useSpring(0, { stiffness: 120, damping: 14 });
  const springY = useSpring(0, { stiffness: 120, damping: 14 });
  const springScroll = useSpring(0, { stiffness: 45, damping: 20 });
  const springVelocity = useSpring(0, { stiffness: 50, damping: 20 });

  // 3. Proximity-based Mouse & Touch coordinates calculation
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!isInView || !containerRef.current) {
        mouseX.set(0);
        mouseY.set(0);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const elCenterX = rect.left + rect.width / 2;
      const elCenterY = rect.top + rect.height / 2;
      
      const dx = clientX - elCenterX;
      const dy = clientY - elCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const maxDistance = 700;
      const influence = Math.max(0, 1 - distance / maxDistance);
      
      const xNorm = (dx / (rect.width || 1)) * influence;
      const yNorm = (dy / (rect.height || 1)) * influence;
      
      mouseX.set(xNorm);
      mouseY.set(yNorm);

      const relX = ((clientX - rect.left) / rect.width) * 100;
      const relY = ((clientY - rect.top) / rect.height) * 100;
      
      containerRef.current.style.setProperty("--reflect-x", `${relX}%`);
      containerRef.current.style.setProperty("--reflect-y", `${relY}%`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isInView, mouseX, mouseY]);

  // 4. Sync values to springs or reset to 0 if out of viewport
  React.useEffect(() => {
    if (isInView) {
      const unsubScroll = scrollY.on("change", (v) => springScroll.set(v));
      const unsubVel = scrollVelocity.on("change", (v) => springVelocity.set(v));
      const unsubMouseX = mouseX.on("change", (v) => springX.set(v));
      const unsubMouseY = mouseY.on("change", (v) => springY.set(v));
      
      return () => {
        unsubScroll();
        unsubVel();
        unsubMouseX();
        unsubMouseY();
      };
    } else {
      // Out of view: smoothly return to rest
      springScroll.set(0);
      springVelocity.set(0);
      springX.set(0);
      springY.set(0);
    }
  }, [isInView, scrollY, scrollVelocity, mouseX, mouseY, springScroll, springVelocity, springX, springY]);

  // Define depth modifiers
  const multiplier = depth === "front" ? 1.0 : depth === "middle" ? 0.65 : 0.35;

  // 5. Transform mappings
  const yTranslate = useTransform(springScroll, [0, 800], [0, -maxTranslateY * multiplier]);
  
  const rotateX = useTransform([springY, springVelocity], ([latestMouseY, latestVelocity]) => {
    const mouseTilt = (latestMouseY as number) * -maxTilt * multiplier * 2.5;
    const velocityTilt = ((latestVelocity as number) / 150) * multiplier;
    const clampedVelocityTilt = Math.max(-10, Math.min(10, velocityTilt));
    return mouseTilt + clampedVelocityTilt;
  });

  const rotateY = useTransform(springX, [-0.5, 0.5], [-maxTilt * multiplier * 2.5, maxTilt * multiplier * 2.5]);
  const rotateZ = useTransform(springVelocity, [-3000, 3000], [-2 * multiplier, 2 * multiplier]);
  const dynamicScale = useTransform(springVelocity, [-4000, 0, 4000], [0.98, 1.0, 0.98]);

  const particleContainerX = useTransform(springX, (v) => `${(v + 0.5) * 100}%`);
  const particleContainerY = useTransform(springY, (v) => `${(v + 0.5) * 100}%`);

  return (
    <motion.div
      ref={containerRef}
      style={{
        y: yTranslate,
        rotateX,
        rotateY,
        rotateZ,
        scale: dynamicScale,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      className={`will-change-transform group relative ${className}`}
    >
      {/* Dynamic Radial highlight reflection layer */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit] z-30" 
        style={{
          background: "radial-gradient(circle at var(--reflect-x, 50%) var(--reflect-y, 50%), rgba(255, 255, 255, 0.08) 0%, transparent 60%)"
        }}
      />

      {/* Static/Floating Background Particles (Distributed inside card background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] z-0 opacity-15">
        <div className="absolute top-8 left-1/4 w-1 h-1 rounded-full bg-white/40" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute bottom-8 left-1/3 w-1.2 h-1.2 rounded-full bg-white/20" />
        <div className="absolute bottom-1/3 right-12 w-1.5 h-1.5 rounded-full bg-white/45" />
        <div className="absolute top-12 right-1/3 w-1 h-1 bg-white/30 rotate-45" />
      </div>

      {/* Colorful micro-particles clustered exactly around the cursor/touch position */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <motion.div
          style={{
            left: particleContainerX,
            top: particleContainerY,
            x: "-50%",
            y: "-50%"
          }}
          className="absolute w-32 h-32 pointer-events-none"
        >
          <div className="absolute top-4 left-6 w-2 h-2 rounded-full bg-neon-cyan blur-[0.4px] shadow-[0_0_8px_#00E5FF] animate-pulse" />
          <div className="absolute bottom-6 right-8 w-1.5 h-1.5 rounded-full bg-neon-violet blur-[0.4px] shadow-[0_0_8px_#7B5CFF]" />
          <div className="absolute top-10 right-4 w-1.5 h-1.5 bg-neon-magenta rotate-45 shadow-[0_0_6px_#FF3CAC]" />
          <div className="absolute bottom-4 left-6 w-2 h-2 rounded-full bg-neon-green blur-[0.3px] shadow-[0_0_8px_#00FFA3]" />
          <div className="absolute top-6 left-12 w-1.2 h-1.2 rounded-full bg-[#FFD700] shadow-[0_0_6px_#FFD700]" />
          <div className="absolute bottom-12 left-10 w-1 h-1 bg-neon-cyan rotate-45" />
          <div className="absolute top-12 left-2 w-1.5 h-1.5 rounded-full bg-neon-magenta blur-[0.5px]" />
          <div className="absolute bottom-2 right-12 w-2 h-2 bg-neon-violet rotate-45 shadow-[0_0_8px_#7B5CFF]" />
        </motion.div>
      </div>

      {children}
    </motion.div>
  );
}
