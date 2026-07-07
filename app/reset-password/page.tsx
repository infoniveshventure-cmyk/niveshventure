"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import PasswordInput from "@/components/ui/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [countdown, setCountdown] = useState(0);

  // Starts the 10s cooldown timer
  function startResendTimer() {
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset_password" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send OTP");
      toast.success("OTP sent to your email");
      setStep(2);
      startResendTimer();
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || newPassword.length < 6) return toast.error("Enter valid OTP and a 6+ char password");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      toast.success("Password updated. You can now log in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card neon-border w-full max-w-md p-8">
        <h1 className="font-display text-xl font-semibold text-center mb-4">Reset password</h1>
        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-3">
            <input className="input-field" type="email" placeholder="Registered email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button disabled={loading} className="btn-primary w-full">{loading ? "Sending..." : "Send OTP"}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitReset} className="space-y-3">
            <p className="text-sm text-ink-muted">Enter the OTP sent to <strong>{email}</strong></p>
            <input className="input-field" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <PasswordInput placeholder="New password (6+ chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button disabled={loading} className="btn-primary w-full">{loading ? "Updating..." : "Update password"}</button>
            
            {/* Resend OTP button */}
            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={loading || countdown > 0}
                onClick={() => sendOtp()}
                className={`flex-1 text-xs py-2 rounded-xl border text-center transition ${
                  countdown > 0
                    ? "border-white/5 text-ink-muted cursor-not-allowed bg-white/2"
                    : "border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/5"
                }`}
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="flex-1 text-xs py-2 rounded-xl border border-white/10 text-ink-muted hover:bg-white/5 transition"
                onClick={() => setStep(1)}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
