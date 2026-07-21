"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ReferralQRCard({ memberId }: { memberId: string }) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const referralLink = `${baseUrl}/register?ref=${memberId}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  }

  function downloadQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `nivesh-venture-referral-${memberId}.png`;
    a.click();
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Nivesh Ventures",
          text: "Join my team on Nivesh Ventures",
          url: referralLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="glass-card p-6 flex flex-col items-center text-center gap-4">
      <h3 className="font-display text-lg font-semibold">Share & Refer</h3>
      <p className="text-sm text-ink-muted -mt-2">
        Anyone who scans this joins under your referral code automatically.
      </p>
      <div ref={canvasWrapRef} className="p-4 bg-white rounded-2xl shadow-neon">
        <QRCodeCanvas value={referralLink} size={180} bgColor="#ffffff" fgColor="#0A0E1A" level="H" />
      </div>
      <div className="w-full bg-base-soft border border-white/10 rounded-xl px-3 py-2 text-xs text-ink-muted break-all">
        {referralLink}
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={copyLink} className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-sm">
          <Copy size={14} /> Copy
        </button>
        <button onClick={downloadQr} className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-sm">
          <Download size={14} /> Save
        </button>
        <button onClick={shareLink} className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm">
          <Share2 size={14} /> Share
        </button>
      </div>
    </div>
  );
}
