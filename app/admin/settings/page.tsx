"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import FileUploadField from "@/components/FileUploadField";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const [s, setS] = useState<any>({ bankDetails: {}, pricing: {} });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then((r) => r.json()).then((d) =>
      setS({ bankDetails: {}, pricing: {}, ...d.settings })
    );
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (res.ok) toast.success("Settings saved"); else toast.error("Failed");
    setSaving(false);
  }

  const generalFields = [
    { key: "websiteName", label: "Website Name" },
    { key: "logoUrl", label: "Logo URL" },
    { key: "contactEmail", label: "Contact Email" },
    { key: "contactPhone", label: "Contact Phone" },
    { key: "paymentUsdtAddress", label: "Payment USDT Address (BEP-20)" },
    { key: "shareRewardAmount", label: "Referral Share Reward (per successful share)" },
    { key: "termsUrl", label: "Terms & Conditions URL" },
    { key: "privacyUrl", label: "Privacy Policy URL" },
  ];

  const bankFields = [
    { key: "bankName", label: "Bank Name" },
    { key: "accountNumber", label: "Account Number" },
    { key: "ifsc", label: "IFSC Code" },
    { key: "accountHolder", label: "Account Holder Name" },
  ];

  const pricingFields = [
    { key: "unlockAccessPrice", label: "Unlock Access Price" },
    { key: "minInvestment", label: "Minimum Investment" },
    { key: "minWithdrawal", label: "Minimum Withdrawal" },
  ];

  return (
    <DashboardShell>
      <AdminSubnav />
      <h1 className="font-display text-2xl font-bold mb-6">Website Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h2 className="font-display font-semibold mb-1">General</h2>
          {generalFields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-ink-muted block mb-1">{f.label}</label>
              <input className="input-field" value={s[f.key] || ""} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>

        <div className="space-y-6">

          <div className="glass-card p-6">
            <h2 className="font-display font-semibold mb-3">Dashboard Welcome Banner</h2>
            <FileUploadField
              label="Banner Image (Replaces NV logo on Dashboard)"
              value={s.dashboardWelcomeBannerUrl || ""}
              onChange={(v) => setS({ ...s, dashboardWelcomeBannerUrl: v })}
              onDelete={() => setS({ ...s, dashboardWelcomeBannerUrl: "" })}
              showWarning={false}
            />
          </div>

          <div className="glass-card p-6">
            <h2 className="font-display font-semibold mb-3">Payment QR Code</h2>
            <FileUploadField
              label="QR Code (users scan to pay)"
              value={s.paymentQrUrl || ""}
              onChange={(v) => setS({ ...s, paymentQrUrl: v })}
              onDelete={() => setS({ ...s, paymentQrUrl: "" })}
              showWarning={false}
            />
          </div>

          <div className="glass-card p-6 space-y-3">
            <h2 className="font-display font-semibold mb-1">Bank Account Details</h2>
            {bankFields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-ink-muted block mb-1">{f.label}</label>
                <input
                  className="input-field"
                  value={s.bankDetails?.[f.key] || ""}
                  onChange={(e) => setS({ ...s, bankDetails: { ...s.bankDetails, [f.key]: e.target.value } })}
                />
              </div>
            ))}
          </div>

          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display font-semibold mb-1">Feature Switches</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Website status (ON/OFF)</p>
                <p className="text-[10px] text-ink-muted">Turn ON to allow login/register; OFF blocks access for regular members</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-white/10 accent-neon-cyan cursor-pointer"
                checked={s.websiteEnabled !== false}
                onChange={(e) => setS({ ...s, websiteEnabled: e.target.checked })}
              />
            </div>

            {s.websiteEnabled === false && (
              <div className="pt-2 border-t border-white/5 space-y-1.5 animate-fadeIn">
                <label className="text-[11px] text-neon-magenta block font-bold">Custom Maintenance Message</label>
                <textarea
                  className="input-field w-full text-xs py-2 h-16 min-h-[64px]"
                  placeholder="e.g. Please try again later. System upgrade in progress."
                  value={s.maintenanceMessage || ""}
                  onChange={(e) => setS({ ...s, maintenanceMessage: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">P2P Transfers</p>
                <p className="text-[10px] text-ink-muted">Enable or disable member-to-member transfers</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-white/10 accent-neon-cyan cursor-pointer"
                checked={s.p2pEnabled !== false}
                onChange={(e) => setS({ ...s, p2pEnabled: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Withdrawals</p>
                <p className="text-[10px] text-ink-muted">Enable or disable member withdrawal requests</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-white/10 accent-neon-cyan cursor-pointer"
                checked={s.withdrawalsEnabled !== false}
                onChange={(e) => setS({ ...s, withdrawalsEnabled: e.target.checked })}
              />
            </div>
          </div>

          <div className="glass-card p-6 space-y-3">
            <h2 className="font-display font-semibold mb-1">Pricing</h2>
            {pricingFields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-ink-muted block mb-1">{f.label}</label>
                <input
                  type="number"
                  className="input-field"
                  value={s.pricing?.[f.key] ?? ""}
                  onChange={(e) => setS({ ...s, pricing: { ...s.pricing, [f.key]: Number(e.target.value) } })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button disabled={saving} onClick={save} className="btn-primary w-full max-w-md mt-6">
        {saving ? "Saving..." : "Save All Settings"}
      </button>
    </DashboardShell>
  );
}
