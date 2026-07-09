"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { useMotion } from "./MotionProvider";

interface PremiumTiltGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  maxTilt?: number; // max degree of tilt
  enableTilt?: boolean;
  enableGlow?: boolean;
}

export function PremiumTiltGlow({
  children,
  className = "",
  glowColor = "rgba(123, 92, 255, 0.15)", // Default neon-violet soft glow
  maxTilt = 8,
  enableTilt = true,
  enableGlow = true,
}: PremiumTiltGlowProps) {
  const { isLowEnd, isTouchDevice } = useMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [hovered, setHovered] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });

  // Spring settings for ultra-smooth 3D tilt interpolation
  const rotateX = useSpring(0, { stiffness: 120, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 120, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Set glow position in pixels
    if (enableGlow && !isTouchDevice) {
      setGlowPos({ x, y });
    }

    // Set tilt rotation values
    if (enableTilt && !isLowEnd && !isTouchDevice) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rY = ((x - centerX) / centerX) * maxTilt;
      const rX = ((centerY - y) / centerY) * maxTilt;
      rotateX.set(rX);
      rotateY.set(rY);
    }
  };

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  const shouldApplyTilt = enableTilt && !isLowEnd && !isTouchDevice;
  const shouldApplyGlow = enableGlow && !isTouchDevice;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        rotateX: shouldApplyTilt ? rotateX : 0,
        rotateY: shouldApplyTilt ? rotateY : 0,
        perspective: 1000,
      }}
      className={`relative overflow-hidden transition-shadow duration-300 ${className}`}
    >
      {/* Soft Radial Cursor Glow beneath card content */}
      {shouldApplyGlow && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${glowPos.x}px ${glowPos.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}

      {/* Moving glass reflection on hover */}
      {hovered && !isLowEnd && (
        <div 
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"
          style={{
            animation: "shimmer 1.5s infinite",
          }}
        />
      )}

      {/* Card Content container (with transformStyle to enable child depth) */}
      <div className="relative z-10 h-full w-full" style={{ transform: shouldApplyTilt ? "translateZ(10px)" : "none" }}>
        {children}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </motion.div>
  );
}
