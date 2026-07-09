"use client";

import React from "react";
import { motion, useTransform } from "framer-motion";
import { useInteractiveMotion } from "./useInteractiveMotion";
import { useMotion } from "./MotionProvider";

interface Interactive3DLayerProps {
  children: React.ReactNode;
  depth?: "front" | "middle" | "back";
  className?: string;
  initialX?: number; // relative placement percentages
  initialY?: number;
}

export function Interactive3DLayer({
  children,
  depth = "middle",
  className = "",
}: Interactive3DLayerProps) {
  const { isLowEnd, isTouchDevice } = useMotion();
  const { mouseX, mouseY, scrollY, scrollVelocity } = useInteractiveMotion();

  // Define depth modifiers
  const depthMultiplier =
    depth === "front" ? 1.0 : depth === "middle" ? 0.5 : 0.2;

  // 1. Parallax scroll displacement (translates vertically)
  const yTranslate = useTransform(
    scrollY,
    [0, 1000],
    [0, -180 * depthMultiplier]
  );

  // 2. Interactive tilt combo: mouse coordinates Y + scroll velocity Y
  const combinedRotateX = useTransform(
    [mouseY, scrollVelocity],
    ([latestMouseY, latestVelocity]) => {
      if (isTouchDevice) return 0;
      
      const mouseTilt = (latestMouseY as number) * -22 * depthMultiplier;
      
      // Calculate scroll tilt offset based on velocity
      const velocityTilt = ((latestVelocity as number) / 180) * depthMultiplier;
      const clampedVelocityTilt = Math.max(-12, Math.min(12, velocityTilt));
      
      return mouseTilt + clampedVelocityTilt;
    }
  );

  // 3. Interactive tilt horizontal: mouse coordinate X
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-22 * depthMultiplier, 22 * depthMultiplier]);

  // 4. Parallax perspective rotation: slightly rotate Z on scroll velocity
  const rotateZ = useTransform(scrollVelocity, [-2000, 2000], [-3 * depthMultiplier, 3 * depthMultiplier]);

  // 5. Scale variation on scroll velocity (slight scale down when scrolling super fast)
  const dynamicScale = useTransform(scrollVelocity, [-4000, 0, 4000], [0.96, 1.0, 0.96]);

  // If low end device, disable complex calculations to keep it running at 60 FPS
  if (isLowEnd) {
    const staticOffset = depth === "front" ? -50 : depth === "middle" ? -25 : 0;
    return (
      <div 
        className={className}
        style={{ transform: `translateY(${staticOffset}px)` }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      style={{
        y: yTranslate,
        rotateX: combinedRotateX,
        rotateY: isTouchDevice ? 0 : rotateY,
        rotateZ: rotateZ,
        scale: dynamicScale,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}
