"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";

export default function BusinessRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/business-rules", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
      }
    } catch {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: any) => {
    setUpdatingKey(key);
    try {
      const res = await fetch("/api/admin/business-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: Number(value) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Rule updated successfully");
        fetchRules();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingKey(null);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  return (
    <DashboardShell>
      <AdminSubnav />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Smart Business Rule Engine</h1>
          <p className="text-sm text-ink-muted mt-1">Configure matching percentages, yields, ROI & referral rates live.</p>
        </div>
        <button
          onClick={fetchRules}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading business rules...</p>
        ) : (
          <div className="space-y-6">
            {rules.map((rule) => (
              <div key={rule.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-white/5 bg-white/5 rounded-xl gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">{rule.label}</h3>
                  <p className="text-xs text-ink-muted mt-0.5">{rule.key}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    defaultValue={rule.value}
                    disabled={updatingKey === rule.key}
                    onBlur={(e) => {
                      if (e.target.value !== String(rule.value)) {
                        handleUpdate(rule.key, e.target.value);
                      }
                    }}
                    className="input-field w-24 text-center text-sm py-1.5 focus:border-neon-magenta"
                  />
                  <span className="text-xs text-ink-muted font-medium w-8">{rule.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
