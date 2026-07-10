"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import AdminSubnav from "@/components/AdminSubnav";
import toast from "react-hot-toast";
import {
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle,
  Clock,
  Shield,
  Search,
} from "lucide-react";

export default function AdminPredictionsPage() {
  const [library, setLibrary] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto prediction scheduler settings
  const [autoPredictionEnabled, setAutoPredictionEnabled] = useState(false);
  const [nextScheduledQuestion, setNextScheduledQuestion] = useState("");

  // Forms
  const [newQuestionText, setNewQuestionText] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [overrideText, setOverrideText] = useState("");

  // Override miss count form
  const [overrideMemberId, setOverrideMemberId] = useState("");
  const [overrideMissValue, setOverrideMissValue] = useState("0");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [libRes, statsRes, subRes] = await Promise.all([
        fetch("/api/admin/predictions", { cache: "no-store" }),
        fetch("/api/admin/predictions?action=stats", { cache: "no-store" }),
        fetch("/api/admin/predictions?action=submissions", { cache: "no-store" }),
      ]);

      if (libRes.ok) {
        const d = await libRes.json();
        setLibrary(d.library || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d);
        setOverrideText(d.dailyQuestion?.questionText || "");
        setAutoPredictionEnabled(d.settings?.autoPredictionEnabled || false);
        setNextScheduledQuestion(d.settings?.nextScheduledQuestion || "");
      }
      if (subRes.ok) {
        const d = await subRes.json();
        setSubmissions(d.submissions || []);
      }
    } catch {
      toast.error("Failed to load prediction details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_question",
          questionText: newQuestionText,
          status: "active",
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Question added successfully");
      setNewQuestionText("");
      loadData();
    } catch {
      toast.error("Failed to add question");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.questionText.trim()) return;

    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_question",
          questionId: editingQuestion._id,
          questionText: editingQuestion.questionText,
          status: editingQuestion.status,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Question updated");
      setEditingQuestion(null);
      loadData();
    } catch {
      toast.error("Failed to update question");
    }
  }

  async function handleToggleStatus(question: any) {
    const nextStatus = question.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_question",
          questionId: question._id,
          status: nextStatus,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success(`Question status updated to ${nextStatus}`);
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_question",
          questionId: id,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Question deleted");
      loadData();
    } catch {
      toast.error("Failed to delete question");
    }
  }

  async function handleToggleAutoPrediction(enabled: boolean) {
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_auto_prediction",
          enabled,
        }),
      });
      if (!res.ok) throw new Error();
      setAutoPredictionEnabled(enabled);
      toast.success(`Auto prediction scheduler turned ${enabled ? "ON" : "OFF"}`);
      loadData();
    } catch {
      toast.error("Failed to update auto prediction setting");
    }
  }

  async function handleSaveAutoSchedule() {
    if (!overrideText.trim()) return;
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_auto_schedule",
          questionText: overrideText,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Auto scheduled question saved successfully!");
      loadData();
    } catch {
      toast.error("Failed to save auto scheduled question");
    }
  }

  async function handleResetToday() {
    if (!confirm("Are you sure you want to remove today's active prediction question?")) return;
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_today_question" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Today's prediction question reset successfully");
      loadData();
    } catch {
      toast.error("Failed to reset today's question");
    }
  }

  async function handleReplaceToday() {
    if (!overrideText.trim()) return;

    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "replace_today_question",
          manualOverrideQuestion: overrideText,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Today's prediction question updated successfully");
      loadData();
    } catch {
      toast.error("Failed to update today's question");
    }
  }

  async function handleTriggerGeneration() {
    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_generation" }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");

      if (d.skipped) {
        toast.success(`Generation skipped: ${d.reason}`);
      } else {
        toast.success("Daily question generated successfully!");
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger generation");
    }
  }

  async function handleOverrideMissCount(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideMemberId.trim()) return;

    try {
      const res = await fetch("/api/admin/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override_miss_count",
          memberId: overrideMemberId,
          newMissCount: parseInt(overrideMissValue),
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");

      toast.success(`Success! Miss count for ${overrideMemberId} set to ${overrideMissValue}`);
      setOverrideMemberId("");
      setOverrideMissValue("0");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to override miss count");
    }
  }

  return (
    <DashboardShell>
      <AdminSubnav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="text-neon-cyan" size={24} />
            Predictions Management
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Manage daily questions, view answer submissions, and override eligibility rules
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition"
        >
          <RotateCcw size={12} /> Refresh Data
        </button>
      </div>

      {/* ── Today's Active Prediction Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Side: Stats and Trigger */}
        <div className="glass-card p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan font-bold uppercase tracking-wider">
                Active Question for {stats?.today || "Today"}
              </span>
              <span className="text-xs text-ink-muted flex items-center gap-1">
                {stats?.dailyQuestion?.isManual ? (
                  <span className="text-yellow-400 font-semibold font-mono">Manual Override</span>
                ) : (
                  <span className="text-neon-green font-semibold font-mono">Auto Selected</span>
                )}
              </span>
            </div>

            <p className="text-lg font-display font-medium text-white mb-6">
              "{stats?.dailyQuestion?.questionText || "No question generated for today yet."}"
            </p>

            {/* Stats section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-ink-muted uppercase">YES Votes</p>
                <p className="text-xl font-bold mt-0.5 text-neon-green">
                  {stats?.stats?.yesCount || 0}
                </p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-ink-muted uppercase">NO Votes</p>
                <p className="text-xl font-bold mt-0.5 text-neon-magenta">
                  {stats?.stats?.noCount || 0}
                </p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-ink-muted uppercase">Total Voted</p>
                <p className="text-xl font-bold mt-0.5 text-neon-cyan">
                  {stats?.stats?.totalSubmissions || 0}
                </p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-ink-muted uppercase">Pending Active</p>
                <p className="text-xl font-bold mt-0.5 text-yellow-400 font-mono">
                  {stats?.stats?.pendingCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTriggerGeneration}
              disabled={loading}
              className="flex-1 btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Play size={14} /> Generate Today's Question
            </button>
            <button
              onClick={handleResetToday}
              disabled={loading || !stats?.dailyQuestion}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-neon-magenta text-white hover:bg-neon-magenta/80 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} /> Reset Today's Question
            </button>
          </div>
        </div>

        {/* Right Side: Manual & Scheduled Question Editor */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold mb-2 flex items-center gap-1.5 text-sm text-white">
              <Edit size={16} className="text-neon-cyan" /> Daily Question Controls
            </h3>
            <p className="text-xs text-ink-muted mb-4">
              Send an immediate live prediction question or save a pending question to auto-publish at 12:00 AM.
            </p>

            {/* Toggle Section */}
            <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs text-white font-medium">Automatic Daily Question</p>
                <p className="text-[10px] text-ink-muted">Automatically Send Daily Question at 12:00 AM</p>
              </div>
              <button
                onClick={() => handleToggleAutoPrediction(!autoPredictionEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoPredictionEnabled ? "bg-neon-cyan" : "bg-white/10"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoPredictionEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {nextScheduledQuestion && autoPredictionEnabled && (
              <div className="mb-4 bg-yellow-400/10 border border-yellow-400/25 p-3 rounded-xl text-xs text-yellow-400">
                <span className="font-semibold block mb-0.5">Pending Scheduled Question:</span>
                "{nextScheduledQuestion}"
              </div>
            )}

            <textarea
              rows={3}
              value={overrideText}
              onChange={(e) => setOverrideText(e.target.value)}
              placeholder="Type question text here..."
              className="input-field w-full text-sm resize-none mb-3"
            />
          </div>

          <div className="space-y-2 mt-auto">
            {autoPredictionEnabled ? (
              <button
                onClick={handleSaveAutoSchedule}
                disabled={!overrideText.trim()}
                className="w-full py-2 text-xs font-semibold rounded-xl bg-yellow-400 text-black hover:bg-yellow-400/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Save Auto Schedule
              </button>
            ) : null}
            <button
              onClick={handleReplaceToday}
              disabled={!overrideText.trim()}
              className="w-full py-2 text-xs font-semibold rounded-xl bg-neon-cyan text-black hover:bg-neon-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send (Live Text Override)
            </button>
          </div>
        </div>
      </div>

      {/* ── Library Management / Super Admin Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Side: Question Library */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-white">Question Library</h3>
            <span className="text-xs text-ink-muted">{library.length} total questions</span>
          </div>

          {/* Add Question Form */}
          <form onSubmit={handleAddQuestion} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Add a new general question to the library..."
              className="input-field flex-1 text-xs"
            />
            <button
              type="submit"
              className="btn-primary px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shrink-0 font-semibold"
            >
              <Plus size={14} /> Add
            </button>
          </form>

          {/* Question List */}
          {editingQuestion ? (
            <form onSubmit={handleSaveEdit} className="bg-white/5 p-4 rounded-xl border border-neon-cyan/20 mb-4">
              <h4 className="text-xs font-semibold text-neon-cyan mb-2">Editing Question</h4>
              <input
                type="text"
                value={editingQuestion.questionText}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                className="input-field w-full text-xs mb-3"
              />
              <div className="flex justify-between items-center">
                <select
                  value={editingQuestion.status}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, status: e.target.value })}
                  className="input-field py-1 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="px-3 py-1 text-xs rounded border border-white/10 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded bg-neon-cyan text-black font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {library.map((q) => (
              <div
                key={q._id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/15 transition-all"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-xs text-white truncate font-medium">{q.questionText}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      onClick={() => handleToggleStatus(q)}
                      className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-bold uppercase tracking-wider ${
                        q.status === "active"
                          ? "bg-neon-green/20 text-neon-green"
                          : "bg-white/10 text-ink-muted"
                      }`}
                    >
                      {q.status}
                    </span>
                    {q.lastUsedDate && (
                      <span className="text-[10px] text-ink-muted">
                        Last used: <span className="text-ink font-mono">{q.lastUsedDate}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="p-1.5 hover:bg-white/5 rounded text-ink-muted hover:text-white transition"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q._id)}
                    className="p-1.5 hover:bg-white/5 rounded text-ink-muted hover:text-neon-magenta transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Super Admin Manual Overrides */}
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold mb-2 flex items-center gap-1.5 text-sm text-yellow-400">
            <Shield size={16} /> Super Admin Controls
          </h3>
          <p className="text-xs text-ink-muted mb-4">
            Manually override daily eligibility criteria or reset monthly miss counters for members.
          </p>

          <form onSubmit={handleOverrideMissCount} className="space-y-3">
            <div>
              <label className="block text-[10px] text-ink-muted uppercase font-bold mb-1">
                Member ID
              </label>
              <input
                type="text"
                value={overrideMemberId}
                onChange={(e) => setOverrideMemberId(e.target.value)}
                placeholder="e.g. member123"
                className="input-field w-full text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-ink-muted uppercase font-bold mb-1">
                New Miss Count Value
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={overrideMissValue}
                onChange={(e) => setOverrideMissValue(e.target.value)}
                className="input-field w-full text-xs"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold rounded-xl bg-yellow-400 text-black hover:bg-yellow-400/80 transition"
            >
              Apply Miss Count Override
            </button>
          </form>
        </div>
      </div>

      {/* ── Submission Logs ── */}
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-lg text-white mb-4">
          Recent Predictions History
        </h3>

        {submissions.length === 0 ? (
          <p className="text-xs text-ink-muted py-6 text-center">
            No submissions recorded yet. Submissions will appear as members answer today's question.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-ink-muted">
                  <th className="py-2">Member ID</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Question Text</th>
                  <th className="py-2">Answer</th>
                  <th className="py-2">Time (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub._id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-bold text-white">{sub.memberId}</td>
                    <td className="py-2.5 font-mono text-ink-muted">{sub.date}</td>
                    <td className="py-2.5 text-white truncate max-w-[250px]">{sub.questionText}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        sub.answer === "yes"
                          ? "bg-neon-green/20 text-neon-green"
                          : "bg-neon-magenta/20 text-neon-magenta"
                      }`}>
                        {sub.answer}
                      </span>
                    </td>
                    <td className="py-2.5 text-ink-muted">{new Date(sub.submittedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
