"use client";

import React, { useEffect, useRef } from "react";

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface BGParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

const COLORS = ["#00E5FF", "#7B5CFF", "#FF3CAC", "#00FFA3", "#FFD700"];

export function GlobalCursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<TrailParticle[]>([]);
  const bgParticlesRef = useRef<BGParticle[]>([]);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Initialize background floating particles (approx 120 particles for atmospheric depth)
      const count = 120;
      const bgParticles: BGParticle[] = [];
      for (let i = 0; i < count; i++) {
        bgParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25, // slow drift
          vy: (Math.random() - 0.5) * 0.25 - 0.1, // slightly upwards
          size: Math.random() * 1.8 + 0.6,
          alpha: Math.random() * 0.25 + 0.1, // subtle opacity
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
      bgParticlesRef.current = bgParticles;
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Spawner helper
    const spawnTrail = (x: number, y: number) => {
      const dx = x - lastPos.current.x;
      const dy = y - lastPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 3) {
        const count = Math.min(4, Math.floor(distance / 3) + 1);
        for (let i = 0; i < count; i++) {
          particlesRef.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 - 0.4,
            size: Math.random() * 2.8 + 1.2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            alpha: 1.0,
            decay: Math.random() * 0.025 + 0.02,
          });
        }
        lastPos.current = { x, y };
      }
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      spawnTrail(e.clientX, e.clientY);
    };

    // Touch drag handler for mobile screens
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        spawnTrail(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw slowly floating background atmospheric particles
      const bgParticles = bgParticlesRef.current;
      for (let i = 0; i < bgParticles.length; i++) {
        const p = bgParticles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Boundary wrapping
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      // 2. Draw trail particles following cursor/touch positions
      const trailParticles = particlesRef.current;
      for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          trailParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        // Glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-screen h-screen"
    />
  );
}
