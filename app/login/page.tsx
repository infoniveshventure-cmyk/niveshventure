"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { auth, signInWithEmailAndPassword } from "@/lib/firebase";
import CopyrightGate from "@/components/CopyrightGate";
import { useAuth } from "@/lib/AuthContext";

import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ 
    websiteEnabled: true, 
    maintenanceMessage: "",
    maintenanceModeActive: false,
    secretMaintenanceMessage: ""
  });

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSiteSettings).catch(() => {});
    
    const errorParam = searchParams.get("error");
    if (errorParam) {
      toast.error(errorParam, { duration: 6000 });
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Fill all fields");
      return;
    }
    setLoading(true);
    try {
      const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => ({}));
      if (settingsRes.maintenanceModeActive) {
        toast.error(settingsRes.secretMaintenanceMessage || "System is under maintenance", { duration: 6000 });
        setLoading(false);
        return;
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      if (!idToken) throw new Error("Firebase ID token unavailable");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: idToken }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(text || "Login failed");
      }
      if (!res.ok) throw new Error(data.error || "Login failed");
      toast.success("Welcome back!");
      await refreshProfile();
      router.push(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message?.replace("Firebase: ", "") || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-scroll-wrapper" data-lenis-prevent>
      <div className="auth-bg">
        {/* Fixed animated blobs */}
        <div className="auth-blob auth-blob-purple" style={{ position: "fixed" }} />
        <div className="auth-blob auth-blob-orange" style={{ position: "fixed" }} />
        <div className="auth-blob auth-blob-purple2" style={{ position: "fixed" }} />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="auth-card relative z-10 w-full max-w-sm p-8 my-auto"
        >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="">
            {/* <div className="auth-logo-ring mb-4"> */}
            <Image src="/logo1.png" alt="Nivesh Ventures" width={200} height={200} className="rounded-2xl" />
          </div>
          {/* <h2 className="auth-brand-name">NIVESH <span>VENTURES</span></h2>
          <p className="auth-brand-tagline">TOGETHER WE GROW</p> */}
        </div>

        {/* Heading */}
        <h1 className="auth-heading">Login</h1>
        <p className="auth-subheading">WELCOME BACK! PLEASE LOGIN TO YOUR ACCOUNT</p>

        {!siteSettings.websiteEnabled && (
          <div className="bg-neon-magenta/15 border border-neon-magenta/30 rounded-xl p-3 text-center mt-4">
            <p className="text-xs font-bold text-neon-magenta uppercase tracking-wider mb-1">⚠️ Maintenance Mode Active</p>
            <p className="text-[11px] text-white leading-relaxed">{siteSettings.maintenanceMessage}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {/* Email */}
          <div className="auth-input-wrapper">
            <input
              className="auth-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <span className="auth-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
          </div>

          {/* Password */}
          <div className="auth-input-wrapper">
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-icon cursor-pointer hover:text-white transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Login button */}
          <button
            disabled={loading}
            className="auth-btn-primary w-full mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                Logging in...
              </span>
            ) : "LOGIN"}
          </button>

          <div className="text-center mt-1">
            <Link href="/reset-password" className="auth-link text-sm">Forgot Password</Link>
          </div>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-link font-semibold">Signup</Link>
        </p>
      </motion.div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 text-center text-xs text-white/25 flex items-center justify-center gap-1.5 z-10 py-2 bg-[#0D0D1A]/60 backdrop-blur-sm">
        <CopyrightGate overlayClassName="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" /> {new Date().getFullYear()} Nivesh Ventures. All rights reserved.
      </footer>
    </div>
  );
}
