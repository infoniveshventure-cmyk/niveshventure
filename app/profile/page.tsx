"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import ReferralQRCard from "@/components/ReferralQRCard";
import { useAuth } from "@/lib/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { compressImage } from "@/lib/imageCompress";
import { Edit2, Loader2, Key, Save, X, User } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const [photoUploading, setPhotoUploading] = useState(false);

  // Edit Profile State
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // USDT Address Change State
  const [newUsdtAddress, setNewUsdtAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Email and Mobile Verification States
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);

  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setEmail(profile.email || "");
      setMobile(profile.mobile || "");
    }
  }, [profile]);

  const displayName = profile?.fullName || firebaseUser?.displayName || "User";
  const displayEmail = profile?.email || firebaseUser?.email || "—";
  const displayAvatar = profile?.profilePhotoUrl || firebaseUser?.photoURL || "";

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file, 90);
      const url = await uploadToCloudinary(compressed);

      // Save to database
      const res = await fetch("/api/user/profile-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile photo");
      }
      toast.success("Profile photo updated");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function sendChangeOtp(type: "email" | "mobile") {
    const isEmail = type === "email";
    const val = isEmail ? email : mobile;
    if (!val.trim()) {
      toast.error(`Enter new ${type} first`);
      return;
    }
    
    if (isEmail) setSendingEmailOtp(true);
    else setSendingMobileOtp(true);

    try {
      const res = await fetch("/api/user/profile/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, newValue: val.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      toast.success(data.message || "OTP sent successfully");
      if (isEmail) setEmailOtpSent(true);
      else setMobileOtpSent(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      if (isEmail) setSendingEmailOtp(false);
      else setSendingMobileOtp(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full Name and Email are required");
      return;
    }

    // Require OTP if email changed
    if (email.trim().toLowerCase() !== profile?.email?.toLowerCase() && !emailOtp) {
      toast.error("Please verify your new email address by requesting and entering an OTP");
      return;
    }

    // Require OTP if mobile changed
    if (mobile.trim() !== (profile?.mobile || "") && !mobileOtp) {
      toast.error("Please verify your mobile number change by requesting and entering an OTP");
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          emailOtp: emailOtp.trim(),
          mobileOtp: mobileOtp.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      toast.success("Profile details updated successfully");
      setEditMode(false);
      setEmailOtp("");
      setEmailOtpSent(false);
      setMobileOtp("");
      setMobileOtpSent(false);
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function sendUsdtOtp() {
    if (!newUsdtAddress.trim()) {
      toast.error("Enter a new USDT address first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/usdt-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-otp" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("OTP sent to your email");
      setOtpSent(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verifyUsdtOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsdtAddress.trim() || !otp) {
      toast.error("USDT address and OTP are required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/usdt-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-otp",
          newAddress: newUsdtAddress.trim(),
          otp: otp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("USDT wallet address updated successfully");
      setNewUsdtAddress("");
      setOtp("");
      setOtpSent(false);
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update USDT address");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="font-display text-2xl font-bold mb-6">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group w-16 h-16 rounded-full overflow-hidden">
                  {displayAvatar ? (
                    <Image src={displayAvatar} alt={displayName} fill sizes="64px" unoptimized className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-xl font-bold text-base">
                      {displayName?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  {/* Upload Hover Overlay */}
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {photoUploading ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : (
                      <Edit2 size={16} className="text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{displayName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    profile?.isActive ? "bg-neon-green/15 text-neon-green" : "bg-white/5 text-ink-muted"
                  }`}>{profile?.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>

              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 text-ink flex items-center gap-1.5 transition"
                >
                  <Edit2 size={13} /> Edit Profile
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Full Name</label>
                    <input
                      className="input-field text-sm"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Email Address</label>
                    <div className="flex gap-2">
                      <input
                        className="input-field text-sm flex-1"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      {email.trim().toLowerCase() !== profile?.email?.toLowerCase() && (
                        <button
                          type="button"
                          disabled={sendingEmailOtp}
                          onClick={() => sendChangeOtp("email")}
                          className="px-3 py-1.5 rounded-xl border border-neon-cyan/40 text-neon-cyan text-xs font-semibold hover:bg-neon-cyan/10 transition shrink-0"
                        >
                          {sendingEmailOtp ? "Sending..." : emailOtpSent ? "Resend" : "Send OTP"}
                        </button>
                      )}
                    </div>
                    {emailOtpSent && email.trim().toLowerCase() !== profile?.email?.toLowerCase() && (
                      <input
                        className="input-field text-sm mt-2 border-yellow-400/40"
                        placeholder="Enter verification code sent to new email"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Mobile Number</label>
                    <div className="flex gap-2">
                      <input
                        className="input-field text-sm flex-1"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                      {mobile.trim() !== (profile?.mobile || "") && (
                        <button
                          type="button"
                          disabled={sendingMobileOtp}
                          onClick={() => sendChangeOtp("mobile")}
                          className="px-3 py-1.5 rounded-xl border border-neon-magenta/40 text-neon-magenta text-xs font-semibold hover:bg-neon-magenta/10 transition shrink-0"
                        >
                          {sendingMobileOtp ? "Sending..." : mobileOtpSent ? "Resend" : "Send OTP"}
                        </button>
                      )}
                    </div>
                    {mobileOtpSent && mobile.trim() !== (profile?.mobile || "") && (
                      <input
                        className="input-field text-sm mt-2 border-yellow-400/40"
                        placeholder="Enter verification code sent to current email"
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value)}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Country</label>
                    <input
                      className="input-field text-sm opacity-50 cursor-not-allowed"
                      value={profile?.country || "—"}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Member ID</label>
                    <input
                      className="input-field text-sm opacity-50 cursor-not-allowed"
                      value={profile?.memberId || "—"}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Sponsor ID</label>
                    <input
                      className="input-field text-sm opacity-50 cursor-not-allowed"
                      value={profile?.sponsorId || "—"}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setFullName(profile?.fullName || "");
                      setEmail(profile?.email || "");
                      setMobile(profile?.mobile || "");
                      setEmailOtp("");
                      setEmailOtpSent(false);
                      setMobileOtp("");
                      setMobileOtpSent(false);
                    }}
                    className="text-xs px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-ink-muted flex items-center gap-1.5 transition"
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    {updatingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-ink-muted">Full Name</p>
                  <p className="text-sm font-medium mt-0.5">{displayName}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Member ID</p>
                  <p className="text-sm font-medium mt-0.5">{profile?.memberId || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Email</p>
                  <p className="text-sm font-medium mt-0.5">{displayEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Mobile</p>
                  <p className="text-sm font-medium mt-0.5">{profile?.mobile || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Country</p>
                  <p className="text-sm font-medium mt-0.5">{profile?.country || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Sponsor ID</p>
                  <p className="text-sm font-medium mt-0.5">{profile?.sponsorId || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Rank</p>
                  <p className="text-sm font-medium mt-0.5">{profile?.rank || "Unranked"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Joined</p>
                  <p className="text-sm font-medium mt-0.5">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            )}
          </div>

          {/* USDT Wallet Management */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg mb-2">USDT Wallet Address</h2>
            <p className="text-xs text-ink-muted mb-4">
              Change or register your USDT (BEP20) wallet address. Updates require email OTP verification.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-ink-muted">Current Address</p>
                <p className="text-sm font-mono font-medium mt-0.5 text-neon-cyan break-all">
                  {profile?.usdtWalletAddress || "Not set / Not registered"}
                </p>
              </div>

              {!otpSent ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="input-field font-mono text-sm flex-1"
                    placeholder="Enter new USDT (BEP20) address"
                    value={newUsdtAddress}
                    onChange={(e) => setNewUsdtAddress(e.target.value)}
                  />
                  <button
                    onClick={sendUsdtOtp}
                    disabled={busy}
                    className="btn-primary py-2.5 whitespace-nowrap text-sm flex items-center justify-center gap-1.5"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                    Send Verification OTP
                  </button>
                </div>
              ) : (
                <form onSubmit={verifyUsdtOtp} className="space-y-3 max-w-md">
                  <div>
                    <p className="text-xs text-ink-muted">New Address</p>
                    <p className="text-xs font-mono font-medium text-ink break-all mt-0.5">{newUsdtAddress}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input-field text-center font-bold tracking-widest text-lg"
                      placeholder="6-Digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-primary px-6 text-sm"
                    >
                      {busy ? "Verifying..." : "Verify & Save"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                    className="text-xs text-neon-magenta hover:underline"
                  >
                    Change address or Resend OTP
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div>
          {profile?.memberId && <ReferralQRCard memberId={profile.memberId} />}
        </div>
      </div>
    </DashboardShell>
  );
}
