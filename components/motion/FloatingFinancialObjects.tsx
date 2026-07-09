"use client";

import React, { useEffect, useState } from "react";
import { useMotion } from "./MotionProvider";

const OBJECTS = [
  // Bitcoin
  {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-1.5H9.5c-.83 0-1.5-.67-1.5-1.5V11c0-.83.67-1.5 1.5-1.5H11V8H9V6.5h2v-1.5h2v1.5h1.5c.83 0 1.5.67 1.5 1.5v1.5c0 .83-.67 1.5-1.5 1.5H13v1.5h2v1.5h-2v1.5z",
    label: "BTC",
    size: 32,
    top: "15%",
    left: "10%",
    speed: "18s",
    delay: "0s",
    opacity: 0.1,
  },
  // Ethereum
  {
    path: "M12 2L4 12l8 10 8-10-8-10z M12 4.5l5.5 6.9L12 14.7 6.5 11.4 12 4.5zm0 14.9v-4.7l5.5-3.3-5.5 8z",
    label: "ETH",
    size: 28,
    top: "35%",
    left: "85%",
    speed: "22s",
    delay: "-3s",
    opacity: 0.08,
  },
  // Dollar
  {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.5 13H11v1.5h-1.5V15c-1.38 0-2.5-1.12-2.5-2.5h1.5c0 .55.45 1 1 1h2.5c.55 0 1-.45 1-1s-.45-1-1-1H11c-1.38 0-2.5-1.12-2.5-2.5S9.62 7 11 7V5.5h1.5V7c1.38 0 2.5 1.12 2.5 2.5H13.5c0-.55-.45-1-1-1h-2.5c-.55 0-1 .45-1 1s.45 1 1 1H13c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5z",
    label: "USD",
    size: 24,
    top: "70%",
    left: "15%",
    speed: "15s",
    delay: "-7s",
    opacity: 0.12,
  },
  // Node Network Dot
  {
    path: "M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z",
    label: "NODE",
    size: 20,
    top: "55%",
    left: "75%",
    speed: "25s",
    delay: "-2s",
    opacity: 0.07,
  },
  // Stock Trend Chart Line
  {
    path: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L3 15.66l.5 2.83z",
    label: "CHART",
    size: 30,
    top: "22%",
    left: "55%",
    speed: "20s",
    delay: "-5s",
    opacity: 0.06,
  },
];

export function FloatingFinancialObjects() {
  const { isLowEnd, reducedMotion } = useMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || reducedMotion) return null;

  // Render fewer objects on low-end devices
  const itemsToRender = isLowEnd ? OBJECTS.slice(0, 2) : OBJECTS;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {itemsToRender.map((obj, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            top: obj.top,
            left: obj.left,
            animation: `float-slow-custom-${idx} ${obj.speed} ease-in-out infinite alternate`,
            animationDelay: obj.delay,
            opacity: obj.opacity,
            willChange: "transform, opacity",
          }}
        >
          <svg
            width={obj.size}
            height={obj.size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-neon-cyan"
          >
            <path d={obj.path} />
          </svg>
          
          <style jsx>{`
            @keyframes float-slow-custom-${idx} {
              0% {
                transform: translateY(0px) rotate(0deg) scale(0.95);
              }
              50% {
                transform: translateY(-25px) translateX(${idx % 2 === 0 ? 10 : -10}px) rotate(${idx % 2 === 0 ? 8 : -8}deg) scale(1);
              }
              100% {
                transform: translateY(10px) translateX(${idx % 2 === 0 ? -5 : 5}px) rotate(${idx % 2 === 0 ? -4 : 4}deg) scale(0.98);
              }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}
