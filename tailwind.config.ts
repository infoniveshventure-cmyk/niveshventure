import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0A0E1A",
          soft: "#10152A",
          card: "#131A33",
        },
        neon: {
          violet: "#7B5CFF",
          cyan: "#00E5FF",
          green: "#00FFA3",
          magenta: "#FF3CAC",
        },
        ink: {
          DEFAULT: "#E8E8F0",
          muted: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(123,92,255,0.35), 0 0 40px rgba(0,229,255,0.15)",
        "neon-sm": "0 0 12px rgba(123,92,255,0.25)",
        glass: "0 8px 32px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 0%, rgba(123,92,255,0.18), transparent 40%), radial-gradient(circle at 80% 10%, rgba(0,229,255,0.14), transparent 40%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
