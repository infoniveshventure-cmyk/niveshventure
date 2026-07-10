"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { auth, signInWithCustomToken } from "@/lib/firebase";
import CopyrightGate from "@/components/CopyrightGate";
import { useAuth } from "@/lib/AuthContext";

const countries = ["India", "United States", "United Kingdom", "United Arab Emirates", "Nepal", "Bangladesh", "Other"];

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ 
    websiteEnabled: true, 
    maintenanceMessage: "",
    maintenanceModeActive: false,
    secretMaintenanceMessage: ""
  });

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSiteSettings).catch(() => {});
    
    const errorParam = params.get("error");
    if (errorParam) {
      toast.error(errorParam, { duration: 6000 });
    }
  }, [params]);

  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    country: "India",
    sponsorId: params.get("ref") || "",
    position: "left",
    otp: "",
  });

  const [sponsorName, setSponsorName] = useState("");
  const [validatingSponsor, setValidatingSponsor] = useState(false);
  const [sponsorError, setSponsorError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!form.sponsorId) { setSponsorName(""); setSponsorError(""); return; }
    const t = setTimeout(async () => {
      setValidatingSponsor(true); setSponsorError("");
      try {
        const res = await fetch(`/api/auth/lookup-sponsor?sponsorId=${encodeURIComponent(form.sponsorId)}`);
        const data = await res.json();
        if (!res.ok) { setSponsorError(data.error || "Invalid referral code"); setSponsorName(""); }
        else { setSponsorName(data.fullName); setSponsorError(""); }
      } catch { setSponsorError("Error checking referral code"); setSponsorName(""); }
      finally { setValidatingSponsor(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.sponsorId]);

  function update(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => ({}));
      if (settingsRes.maintenanceModeActive) {
        toast.error(settingsRes.secretMaintenanceMessage || "Registration is temporarily closed.", { duration: 6000 });
        setLoading(false);
        return;
      }
      if (!form.fullName || !form.mobile || !form.email || form.password.length < 6) {
        toast.error("Fill all fields — password needs 6+ characters");
        setLoading(false);
        return;
      }
      if (form.sponsorId && sponsorError) {
        toast.error("Please enter a valid referral code or clear the field");
        setLoading(false);
        return;
      }
      if (form.sponsorId && validatingSponsor) {
        toast.error("Validating referral code... please wait.");
        setLoading(false);
        return;
      }

      // Send OTP only — Firebase account is created server-side after OTP verification.
      // This prevents incomplete registrations from permanently blocking the email.
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("OTP sent to your Gmail");
      setStep(2); setCooldown(60);
    } catch (err: any) {
      toast.error(err.message?.replace("Firebase: ", "") || "Could not send OTP");
    } finally { setLoading(false); }
  }

  async function handleResendOtp() {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    try {
      const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => ({}));
      if (settingsRes.maintenanceModeActive) {
        toast.error(settingsRes.secretMaintenanceMessage || "Registration is temporarily closed.", { duration: 6000 });
        setLoading(false);
        return;
      }
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("OTP resent to your Gmail");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Could not resend OTP");
    } finally { setLoading(false); }
  }

  async function handleVerifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const settingsRes = await fetch("/api/settings").then((r) => r.json()).catch(() => ({}));
      if (settingsRes.maintenanceModeActive) {
        toast.error(settingsRes.secretMaintenanceMessage || "Registration is temporarily closed.", { duration: 6000 });
        setLoading(false);
        return;
      }
      if (form.otp.length !== 6) {
        toast.error("Enter the 6-digit OTP");
        setLoading(false);
        return;
      }
      // Send password instead of firebaseIdToken — server creates Firebase account after OTP is verified.
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Sign the client into Firebase using the custom token returned by the server.
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
      toast.success("Account created — check your email for your Member ID");
      await refreshProfile();
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-scroll-wrapper" data-lenis-prevent>
      <div className="auth-bg">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="auth-card relative z-10 w-full max-w-sm p-8 my-auto"
        >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="">
          {/* <div className="auth-logo-ring mb-3"> */}
            <Image src="/logo1.png" alt="Nivesh Ventures" width={200} height={200} className="rounded-2xl" />
          </div>
          {/* <h2 className="auth-brand-name">NIVESH <span>VENTURES</span></h2>
          <p className="auth-brand-tagline">TOGETHER WE GROW</p> */}
        </div>

        {siteSettings.websiteEnabled ? (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className={`auth-step-dot ${step === 1 ? "active" : "done"}`}>
                {step > 1 ? "✓" : "1"}
              </div>
              <div className={`auth-step-line ${step === 2 ? "active" : ""}`} />
              <div className={`auth-step-dot ${step === 2 ? "active" : ""}`}>2</div>
            </div>

            <h1 className="auth-heading">{step === 1 ? "Register" : "Verify Email"}</h1>
            <p className="auth-subheading">
              {step === 1 ? "CREATE YOUR ACCOUNT — STEP 1 OF 2" : "ENTER THE OTP SENT TO YOUR GMAIL"}
            </p>

            <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSendOtp}
              className="mt-5 space-y-3"
            >
              {/* Full Name */}
              <div className="auth-input-wrapper">
                <input className="auth-input" placeholder="Real Full Name" value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)} />
                <span className="auth-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
              </div>

              {/* Mobile */}
              <div className="auth-input-wrapper">
                <input className="auth-input" placeholder="Mobile Number" value={form.mobile}
                  onChange={(e) => update("mobile", e.target.value)} />
                <span className="auth-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                </span>
              </div>

              {/* Email */}
              <div className="auth-input-wrapper">
                <input className="auth-input" type="email" placeholder="Gmail Address" value={form.email}
                  onChange={(e) => update("email", e.target.value)} />
                <span className="auth-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
              </div>

              {/* Password */}
              <div className="auth-input-wrapper">
                <input className="auth-input" type={showPassword ? "text" : "password"}
                  placeholder="Password (6+ chars)" value={form.password}
                  onChange={(e) => update("password", e.target.value)} />
                <button type="button" className="auth-input-icon cursor-pointer hover:text-white transition-colors"
                  onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Country */}
              <div className="auth-input-wrapper">
                <select className="auth-input auth-select" value={form.country} onChange={(e) => update("country", e.target.value)}>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="auth-input-icon pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </div>

              {/* Referral Code */}
              <div className="space-y-1">
                <div className="auth-input-wrapper">
                  <input className="auth-input" placeholder="Referral Code (optional)" value={form.sponsorId}
                    onChange={(e) => update("sponsorId", e.target.value)} />
                  <span className="auth-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </span>
                </div>
                {validatingSponsor && (
                  <p className="text-xs text-white/40 px-1 animate-pulse">Validating referral code...</p>
                )}
                {!validatingSponsor && sponsorName && (
                  <p className="text-xs text-emerald-400 font-medium px-1 flex items-center gap-1">
                    ✓ Sponsor: <span className="font-semibold text-white">{sponsorName}</span>
                  </p>
                )}
                {!validatingSponsor && sponsorError && (
                  <p className="text-xs text-rose-400 font-medium px-1 flex items-center gap-1">✗ {sponsorError}</p>
                )}
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className={`auth-radio-label ${form.position === "left" ? "active" : ""}`}>
                  <input type="radio" name="pos" className="sr-only" checked={form.position === "left"} onChange={() => update("position", "left")} />
                  <span className={`auth-radio-dot ${form.position === "left" ? "active" : ""}`} />
                  Left
                </label>
                <label className={`auth-radio-label ${form.position === "right" ? "active" : ""}`}>
                  <input type="radio" name="pos" className="sr-only" checked={form.position === "right"} onChange={() => update("position", "right")} />
                  <span className={`auth-radio-dot ${form.position === "right" ? "active" : ""}`} />
                  Right
                </label>
              </div>

              <button disabled={loading} className="auth-btn-primary w-full mt-1">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    Sending OTP...
                  </span>
                ) : "SEND OTP & CONTINUE"}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleVerifyAndRegister}
              className="mt-5 space-y-4"
            >
              <p className="text-sm text-white/50 text-center">
                Code sent to <span className="text-[#00E5FF] font-medium">{form.email}</span>
              </p>

              {/* OTP input */}
              <div className="auth-input-wrapper">
                <input
                  className="auth-input text-center tracking-[0.7em] text-xl font-bold"
                  maxLength={6} placeholder="——————"
                  value={form.otp}
                  onChange={(e) => update("otp", e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <button disabled={loading} className="auth-btn-primary w-full">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    Verifying...
                  </span>
                ) : "VERIFY & CREATE ACCOUNT"}
              </button>

              <div className="flex justify-between items-center">
                <button type="button" onClick={() => setStep(1)}
                  className="text-white/40 hover:text-white text-sm transition-colors">← Back</button>
                {cooldown > 0 ? (
                  <span className="text-white/40 text-xs">
                    Resend in <span className="text-[#00E5FF] font-mono font-bold">{cooldown}s</span>
                  </span>
                ) : (
                  <button type="button" onClick={handleResendOtp} disabled={loading}
                    className="auth-link text-xs disabled:opacity-40">Resend OTP</button>
                )}
              </div>

              <p className="text-xs text-yellow-500/70 bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 text-center leading-relaxed">
                If you are not receiving the OTP, please check your spam/junk folder once before requesting to resend it.
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-white/40 mt-5">
          Already registered?{" "}
          <Link href="/login" className="auth-link font-semibold">Log in</Link>
        </p>
          </>
        ) : (
          <div className="text-center space-y-4">
            <h1 className="auth-heading text-neon-magenta">Maintenance Mode</h1>
            <div className="bg-neon-magenta/15 border border-neon-magenta/30 rounded-xl p-4 my-4 animate-pulse">
              <p className="text-xs font-bold text-neon-magenta uppercase tracking-wider mb-2">⚠️ Registration Blocked</p>
              <p className="text-xs text-white leading-relaxed">{siteSettings.maintenanceMessage}</p>
            </div>
            <p className="text-sm text-white/40">
              Please try again later. If you are an administrator, you can log in below:
            </p>
            <Link href="/login" className="btn-primary w-full inline-block py-2.5 rounded-xl text-center text-sm font-semibold transition-all">
              Go to Admin Login
            </Link>
          </div>
        )}
      </motion.div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 text-center text-xs text-white/25 flex items-center justify-center gap-1.5 z-10 py-2 bg-[#0D0D1A]/60 backdrop-blur-sm">
        <CopyrightGate /> {new Date().getFullYear()} Nivesh Ventures. All rights reserved.
      </footer>
    </div>
  );
}
