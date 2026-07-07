"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import { KeyRound, Wallet, Mail, RefreshCw } from "lucide-react";

import PasswordInput from "@/components/ui/PasswordInput";

export default function SettingsPage() {
  const { profile } = useAuth();

  const [loginKeyStep, setLoginKeyStep] = useState<0 | 1>(0);
  const [loginOtp, setLoginOtp] = useState("");
  const [currentLoginKey, setCurrentLoginKey] = useState("");
  const [newLoginKey, setNewLoginKey] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [accessKeyStep, setAccessKeyStep] = useState<0 | 1>(0);
  const [accessOtp, setAccessOtp] = useState("");
  const [confirmLoginKey, setConfirmLoginKey] = useState("");
  const [newAccessKey, setNewAccessKey] = useState<string | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);

  const [usdtAddress, setUsdtAddress] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function requestOtp(purpose: "login_key_change" | "access_key_change") {
    if (!profile?.email) return;
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("OTP sent to your email");
      if (purpose === "login_key_change") setLoginKeyStep(1);
      else setAccessKeyStep(1);
    } catch (err: any) {
      toast.error(err.message || "Could not send OTP");
    }
  }

  async function submitLoginKeyChange(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    try {
      const res = await fetch("/api/auth/change-login-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: loginOtp, currentLoginKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewLoginKey(data.newLoginKey);
      toast.success("Login Key updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setLoginBusy(false);
    }
  }

  async function submitAccessKeyChange(e: React.FormEvent) {
    e.preventDefault();
    setAccessBusy(true);
    try {
      const res = await fetch("/api/auth/change-access-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: accessOtp, loginKey: confirmLoginKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewAccessKey(data.newAccessKey);
      toast.success("Access Key updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setAccessBusy(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={17} className="text-neon-cyan" />
            <h2 className="font-display font-semibold">Change Login Key</h2>
          </div>
          <p className="text-xs text-ink-muted mb-4">Requires OTP verification to your registered Gmail.</p>

          {newLoginKey ? (
            <div className="bg-base-soft rounded-xl p-4 text-sm">
              <p className="text-ink-muted mb-1">Your new Login Key:</p>
              <p className="text-neon-green font-mono text-base">{newLoginKey}</p>
              <p className="text-xs text-neon-magenta mt-2">Save this now — it won't be shown again.</p>
            </div>
          ) : loginKeyStep === 0 ? (
            <button onClick={() => requestOtp("login_key_change")} className="btn-primary text-sm">
              Send OTP to Email
            </button>
          ) : (
            <form onSubmit={submitLoginKeyChange} className="space-y-3">
              <input className="input-field" placeholder="Enter OTP" value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value)} />
              <PasswordInput placeholder="Current Login Key" value={currentLoginKey}
                onChange={(e) => setCurrentLoginKey(e.target.value)} />
              <button disabled={loginBusy} className="btn-primary text-sm">
                {loginBusy ? "Updating..." : "Update Login Key"}
              </button>
            </form>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={17} className="text-neon-magenta" />
            <h2 className="font-display font-semibold">Change Access Key</h2>
          </div>
          <p className="text-xs text-ink-muted mb-4">Requires OTP + your current Login Key for security.</p>

          {newAccessKey ? (
            <div className="bg-base-soft rounded-xl p-4 text-sm">
              <p className="text-ink-muted mb-1">Your new Access Key:</p>
              <p className="text-neon-green font-mono text-base">{newAccessKey}</p>
              <p className="text-xs text-neon-magenta mt-2">Save this now — it won't be shown again.</p>
            </div>
          ) : accessKeyStep === 0 ? (
            <button onClick={() => requestOtp("access_key_change")} className="btn-primary text-sm">
              Send OTP to Email
            </button>
          ) : (
            <form onSubmit={submitAccessKeyChange} className="space-y-3">
              <input className="input-field" placeholder="Enter OTP" value={accessOtp}
                onChange={(e) => setAccessOtp(e.target.value)} />
              <PasswordInput placeholder="Login Key (for verification)" value={confirmLoginKey}
                onChange={(e) => setConfirmLoginKey(e.target.value)} />
              <button disabled={accessBusy} className="btn-primary text-sm">
                {accessBusy ? "Updating..." : "Update Access Key"}
              </button>
            </form>
          )}
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={17} className="text-neon-green" />
            <h2 className="font-display font-semibold">Wallet ID</h2>
          </div>
          <p className="text-xs text-ink-muted mb-4">USDT (BEP-20) address used for deposits and withdrawals.</p>
          <p className="text-sm text-ink-muted mb-3">Current: <span className="text-ink">{profile?.usdtWalletAddress || "Not set"}</span></p>
          <div className="flex gap-3">
            <input className="input-field flex-1" placeholder="New USDT wallet address" value={usdtAddress}
              onChange={(e) => setUsdtAddress(e.target.value)} />
            <button
              disabled={walletBusy || !usdtAddress}
              onClick={async () => {
                setWalletBusy(true);
                toast.error("Wallet ID update requires Access Key verification — coming from your Access Key panel.");
                setWalletBusy(false);
              }}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>

        {/* Resend Keys Section */}
        <div className="glass-card p-6 lg:col-span-2 border-neon-violet/20">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={17} className="text-neon-violet" />
            <h2 className="font-display font-semibold">Resend My Keys to Email</h2>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            If you lost your Login Key or Access Key, click below to generate new keys and have them sent to your registered email: <span className="text-ink">{profile?.email}</span>
          </p>
          {resendSent ? (
            <div className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-4 text-sm text-neon-green">
              ✓ New keys have been generated and sent to your email. Check your inbox (and spam folder).
            </div>
          ) : (
            <button
              disabled={resendBusy}
              onClick={async () => {
                if (!confirm("This will REPLACE your current Login Key and Access Key. Your old keys will no longer work. Continue?")) return;
                setResendBusy(true);
                try {
                  const res = await fetch("/api/auth/resend-keys", { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setResendSent(true);
                  toast.success("Keys sent to your email!");
                } catch (err: any) {
                  toast.error(err.message || "Failed to resend keys");
                } finally {
                  setResendBusy(false);
                }
              }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <RefreshCw size={15} className={resendBusy ? "animate-spin" : ""} />
              {resendBusy ? "Generating Keys..." : "Generate & Send New Keys"}
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
