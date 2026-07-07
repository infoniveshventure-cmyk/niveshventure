"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import { RefreshCw, Edit, Trash, X, AlertTriangle } from "lucide-react";

export default function BusinessRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [deletedLogs, setDeletedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(true);
  
  // Modals state
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [deletingRule, setDeletingRule] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for editing
  const [formLabel, setFormLabel] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formType, setFormType] = useState("number");
  const [formValue, setFormValue] = useState<any>("");
  const [formMin, setFormMin] = useState<any>("");
  const [formMax, setFormMax] = useState<any>("");
  const [formUnit, setFormUnit] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsEditable, setFormIsEditable] = useState(true);
  const [formNote, setFormNote] = useState("");

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

  const fetchDeletedRules = async () => {
    setLoadingDeleted(true);
    try {
      const res = await fetch("/api/admin/business-rules?deleted=true", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setDeletedLogs(data.logs || []);
      }
    } catch {
      toast.error("Failed to load deleted rules history");
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleEditClick = (rule: any) => {
    setEditingRule(rule);
    setFormLabel(rule.label || "");
    setFormCategory(rule.category || "general");
    setFormType(rule.type || "number");
    setFormValue(rule.value !== undefined ? String(rule.value) : "");
    setFormMin(rule.min !== null && rule.min !== undefined ? String(rule.min) : "");
    setFormMax(rule.max !== null && rule.max !== undefined ? String(rule.max) : "");
    setFormUnit(rule.unit || "");
    setFormDescription(rule.description || "");
    setFormIsEditable(rule.isEditable !== undefined ? rule.isEditable : true);
    setFormNote("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    setSubmitting(true);
    try {
      let finalValue: any = formValue;
      if (formType === "number" || formType === "percentage") {
        finalValue = Number(formValue);
      } else if (formType === "boolean") {
        finalValue = formValue === "true";
      }

      const res = await fetch("/api/admin/business-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editingRule.key,
          label: formLabel,
          category: formCategory,
          type: formType,
          value: finalValue,
          min: formMin === "" ? null : Number(formMin),
          max: formMax === "" ? null : Number(formMax),
          unit: formUnit,
          description: formDescription,
          isEditable: formIsEditable,
          note: formNote,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Rule updated successfully");
        setEditingRule(null);
        fetchRules();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/business-rules?key=${encodeURIComponent(deletingRule.key)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Rule deleted successfully");
        setDeletingRule(null);
        fetchRules();
        fetchDeletedRules();
      } else {
        const data = await res.json();
        toast.error(data.error || "Deletion failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchDeletedRules();
  }, []);

  return (
    <DashboardShell>
      <AdminSubnav />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Smart Business Rule Engine</h1>
          <p className="text-sm text-ink-muted mt-1">Configure and manage matching percentages, yields, ROI & referral rates live.</p>
        </div>
        <button
          onClick={() => {
            fetchRules();
            fetchDeletedRules();
          }}
          className="flex items-center gap-2 text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-ink px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={14} className={loading || loadingDeleted ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Rules list */}
      <div className="glass-card p-5 mb-8">
        <h2 className="text-base font-semibold text-white mb-4">Active Business Rules</h2>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading business rules...</p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-white/5 bg-white/5 rounded-xl gap-4 hover:border-white/10 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{rule.label}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-ink-muted bg-white/5 uppercase font-medium">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 font-mono">{rule.key}</p>
                  {rule.description && (
                    <p className="text-xs text-ink-muted/80 mt-1 italic">{rule.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-bold text-neon-magenta">{String(rule.value)}</span>
                    <span className="text-xs text-ink-muted ml-1">{rule.unit}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(rule)}
                      className="p-2 border border-white/10 bg-white/5 hover:bg-neon-magenta hover:text-white hover:border-neon-magenta rounded-lg text-ink-muted transition"
                      title="Edit Rule"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingRule(rule)}
                      className="p-2 border border-white/10 bg-white/5 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-lg text-ink-muted transition"
                      title="Remove Rule"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deleted rules history log */}
      <div className="glass-card p-5">
        <h2 className="text-base font-semibold text-white mb-4">Removed Rules History</h2>
        {loadingDeleted ? (
          <p className="text-sm text-ink-muted">Loading deletion history...</p>
        ) : deletedLogs.length === 0 ? (
          <p className="text-xs text-ink-muted">No business rules have been deleted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-ink-muted">
                  <th className="py-2 px-3">Rule Name (Key)</th>
                  <th className="py-2 px-3">Removed By</th>
                  <th className="py-2 px-3">Date & Time</th>
                  <th className="py-2 px-3">Previous Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deletedLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/5">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{log.label}</div>
                      <div className="text-[10px] text-ink-muted font-mono">{log.key}</div>
                    </td>
                    <td className="py-3 px-3 text-white">
                      {log.deletedByAdminName}
                      <div className="text-[10px] text-ink-muted font-mono">ID: {log.deletedByAdminId}</div>
                    </td>
                    <td className="py-3 px-3 text-ink-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-ink-muted max-w-xs truncate">
                      {JSON.stringify(log.previousData)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 relative">
            <button
              onClick={() => setEditingRule(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Edit Business Rule</h3>
            <p className="text-xs text-ink-muted mb-4 font-mono">Key: {editingRule.key}</p>

            <form onSubmit={handleSave} className="space-y-4 text-sm text-left">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">Rule Name (Label)</label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Rule Category/Type</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta bg-[#121214]"
                  >
                    <option value="rewards">Reward</option>
                    <option value="referral">Commission</option>
                    <option value="returns">Return</option>
                    <option value="matching">Binary Matching Income</option>
                    <option value="booster">Booster Income</option>
                    <option value="general">General Settings</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Value Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta bg-[#121214]"
                  >
                    <option value="number">Number</option>
                    <option value="percentage">Percentage</option>
                    <option value="string">String</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Value</label>
                  {formType === "boolean" ? (
                    <select
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta bg-[#121214]"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      type={formType === "string" ? "text" : "number"}
                      step="any"
                      required
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. %, $, days"
                    className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta"
                  />
                </div>
              </div>

              {(formType === "number" || formType === "percentage") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Min Limit</label>
                    <input
                      type="number"
                      step="any"
                      value={formMin}
                      onChange={(e) => setFormMin(e.target.value)}
                      placeholder="No limit"
                      className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">Max Limit</label>
                    <input
                      type="number"
                      step="any"
                      value={formMax}
                      onChange={(e) => setFormMax(e.target.value)}
                      placeholder="No limit"
                      className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-white mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta min-h-[60px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formIsEditable"
                  checked={formIsEditable}
                  onChange={(e) => setFormIsEditable(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-neon-magenta focus:ring-neon-magenta"
                />
                <label htmlFor="formIsEditable" className="text-xs font-semibold text-white">Rule is editable</label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">Change Note (Required)</label>
                <input
                  type="text"
                  required
                  placeholder="Reason for change"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="input-field w-full py-2 px-3 text-sm focus:border-neon-magenta"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-neon-magenta hover:bg-neon-magenta/90 text-white font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative border-red-500/20">
            <button
              onClick={() => setDeletingRule(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Delete Business Rule</h3>
            </div>
            <p className="text-sm text-ink-muted mb-6">
              Are you sure you want to remove the business rule <span className="font-semibold text-white">"{deletingRule.label}"</span>?
              This action cannot be undone, but a backup/history log of previous settings will be stored.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingRule(null)}
                className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
