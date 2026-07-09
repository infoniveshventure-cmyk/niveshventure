"use client";

import React from "react";
import { motion } from "framer-motion";
import { useMotion } from "./MotionProvider";

interface RevealOnScrollProps {
  children: React.ReactNode;
  variant?: "fadeIn" | "slideUp" | "scaleUp" | "slideRight";
  delay?: number;
  duration?: number;
  threshold?: number;
  staggerChildren?: number;
  className?: string;
}

export function RevealOnScroll({
  children,
  variant = "slideUp",
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  staggerChildren = 0,
  className = "",
}: RevealOnScrollProps) {
  const { isLowEnd, reducedMotion } = useMotion();

  // If reduced motion is requested or it's a very low-end device, keep transition instant
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants = {
    hidden: {
      opacity: 0,
      y: variant === "slideUp" ? 25 : 0,
      x: variant === "slideRight" ? -25 : 0,
      scale: variant === "scaleUp" ? 0.95 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: isLowEnd ? duration * 0.7 : duration,
        delay,
        ease: [0.16, 1, 0.3, 1] as const, // easeOutExponential
        when: "beforeChildren",
        staggerChildren: staggerChildren || undefined,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  delay = 0,
  stagger = 0.1,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  stagger?: number;
  className?: string;
}) {
  const { reducedMotion } = useMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  variant = "slideUp",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "fadeIn" | "slideUp" | "scaleUp";
}) {
  const { reducedMotion } = useMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: variant === "slideUp" ? 20 : 0,
      scale: variant === "scaleUp" ? 0.95 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
