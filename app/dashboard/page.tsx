"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import Link from "next/link";
import DirectProgressCard from "@/components/DirectProgressCard";
import BoosterProgressCard from "@/components/BoosterProgressCard";
import TransactionChart from "@/components/TransactionChart";
import toast from "react-hot-toast";
import { CountUpNumber } from "@/components/motion/CountUpNumber";
import { PremiumTiltGlow } from "@/components/motion/PremiumTiltGlow";

type Tx = { _id: string; type: string; direction: "credit" | "debit"; amount: number; currency: string; createdAt: string; note: string };

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [dailyReturnPending, setDailyReturnPending] = useState(0);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerUrl, setBannerUrl] = useState("");

  // Prediction system state
  const [predQuestion, setPredQuestion] = useState<any>(null);
  const [predSubmission, setPredSubmission] = useState<any>(null);
  const [monthlyMissCount, setMonthlyMissCount] = useState(0);
  const [remainingFreeMisses, setRemainingFreeMisses] = useState(0);
  const [submittingPrediction, setSubmittingPrediction] = useState(false);
  const [currentReturnPlan, setCurrentReturnPlan] = useState(7);
  const [accountState, setAccountState] = useState<string>("prediction_available");
  const [countdownEndTime, setCountdownEndTime] = useState<number>(0);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [investmentCompleted, setInvestmentCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [totalActiveInvestment, setTotalActiveInvestment] = useState(0);
  const [dailyReturn, setDailyReturn] = useState(0);
  const [predictionDaysCount, setPredictionDaysCount] = useState(0);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, walletRes, settingsRes, predRes] = await Promise.all([
          fetch("/api/user/me", { cache: "no-store" }),
          fetch("/api/wallet", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/user/predictions", { cache: "no-store" }),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          setStats(me.stats);
          setUser(me.user);
          setDailyReturnPending(me.stats?.dailyReturnPending || 0);
        }
        if (walletRes.ok) {
          const w = await walletRes.json();
          setTransactions(w.transactions || []);
        }
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setBannerUrl(s.dashboardWelcomeBannerUrl || "");
        }
        if (predRes.ok) {
          const pred = await predRes.json();
          setAccountState(pred.accountState || "prediction_available");
          setPredQuestion(pred.dailyQuestion);
          setPredSubmission(pred.submission);
          setMonthlyMissCount(pred.monthlyMissCount || 0);
          setRemainingFreeMisses(pred.remainingFreeMisses || 0);
          setPredictionLocked(pred.predictionLocked || false);
          setCountdownEndTime(pred.countdownEndTime || 0);
          setInvestmentCompleted(pred.investmentCompleted || false);
          setCurrentReturnPlan(pred.currentReturnPlan || 7);
          setTotalActiveInvestment(pred.totalActiveInvestment || 0);
          setDailyReturn(pred.dailyReturn || 0);
          setPredictionDaysCount(pred.predictionDaysCount || 0);
          if (pred.dailyReturnPending !== undefined) {
            setDailyReturnPending(pred.dailyReturnPending);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    fetch("/api/admin/offers", { cache: "no-store" }).then((r) => r.json()).then((d) => setOffers(d.offers || []));
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!countdownEndTime || accountState !== "prediction_locked") return;

    function updateTimer() {
      const now = Date.now();
      const diff = countdownEndTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        // Auto refresh
        fetch("/api/user/predictions")
          .then((r) => r.json())
          .then((pred) => {
            setAccountState(pred.accountState || "prediction_available");
            setPredQuestion(pred.dailyQuestion);
            setPredSubmission(pred.submission);
            setMonthlyMissCount(pred.monthlyMissCount || 0);
            setRemainingFreeMisses(pred.remainingFreeMisses || 0);
            setPredictionLocked(pred.predictionLocked || false);
            setCountdownEndTime(pred.countdownEndTime || 0);
            setInvestmentCompleted(pred.investmentCompleted || false);
            setCurrentReturnPlan(pred.currentReturnPlan || 7);
            setTotalActiveInvestment(pred.totalActiveInvestment || 0);
            setDailyReturn(pred.dailyReturn || 0);
            setPredictionDaysCount(pred.predictionDaysCount || 0);
            if (pred.dailyReturnPending !== undefined) {
              setDailyReturnPending(pred.dailyReturnPending);
            }
          });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [countdownEndTime, accountState]);

  const cards = [
    { label: "Wallet Balance", value: user?.walletBalance ?? profile?.walletBalance ?? 0, icon: Wallet, prefix: "$", href: "/wallet", color: "text-neon-cyan" },
    {
      label: "Total Earnings", value:
        (user?.totalReferralIncome ?? profile?.totalReferralIncome ?? 0) +
        (user?.totalMatchingIncome ?? profile?.totalMatchingIncome ?? 0) +
        (user?.totalReturnsIncome ?? profile?.totalReturnsIncome ?? 0) +
        (user?.totalLevelIncome ?? profile?.totalLevelIncome ?? 0) +
        (user?.totalRewardIncome ?? profile?.totalRewardIncome ?? 0) +
        (user?.totalReturnsLevelIncomeEarned ?? 0) +
        (user?.totalBoosterIncome ?? 0),
      icon: TrendingUp, prefix: "$", href: "/income", color: "text-neon-green"
    },
    { label: "Total Team", value: stats?.totalTeam ?? 0, icon: Users, prefix: "", href: "/team", color: "" },
    { label: "Total Withdrawn", value: user?.totalWithdrawn ?? profile?.totalWithdrawn ?? 0, icon: ArrowUpRight, prefix: "$", href: "/withdrawal", color: "" },
    { label: "Daily Return (Pending)", value: dailyReturn, icon: Clock, prefix: "$", href: "/income", color: "text-yellow-400", isPending: true },
    { label: "Pending Returns Level Income", value: user?.pendingReturnsLevelIncome ?? 0, icon: Clock, prefix: "$", href: "/income", color: "text-neon-magenta", isPendingReturnsLevel: true },
    { label: "Booster Wallet Balance", value: user?.boosterWalletBalance ?? profile?.boosterWalletBalance ?? 0, icon: Wallet, prefix: "$", href: "/booster-wallet", color: "text-amber-400", isBooster: true },
  ];

  async function handlePredict(answer: "yes" | "no") {
    if (submittingPrediction) return;
    setSubmittingPrediction(true);
    try {
      const res = await fetch("/api/user/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setPredSubmission(data.submission);
      toast.success("Prediction Submitted Successfully!");

      // Reload me stats
      const meRes = await fetch("/api/user/predictions", { cache: "no-store" });
      if (meRes.ok) {
        const pred = await meRes.json();
        setAccountState(pred.accountState || "prediction_available");
        setPredQuestion(pred.dailyQuestion);
        setPredSubmission(pred.submission);
        setMonthlyMissCount(pred.monthlyMissCount || 0);
        setRemainingFreeMisses(pred.remainingFreeMisses || 0);
        setPredictionLocked(pred.predictionLocked || false);
        setCountdownEndTime(pred.countdownEndTime || 0);
        setInvestmentCompleted(pred.investmentCompleted || false);
        setCurrentReturnPlan(pred.currentReturnPlan || 7);
        setTotalActiveInvestment(pred.totalActiveInvestment || 0);
        setDailyReturn(pred.dailyReturn || 0);
        setPredictionDaysCount(pred.predictionDaysCount || 0);
        if (pred.dailyReturnPending !== undefined) {
          setDailyReturnPending(pred.dailyReturnPending);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit prediction");
    } finally {
      setSubmittingPrediction(false);
    }
  }

  return (
    <DashboardShell>
      {/* ── Welcome Hero Card ── */}
      <div
        className="mb-6 relative overflow-hidden rounded-2xl p-5 lg:p-7"
        style={{
          background: "linear-gradient(135deg, #0d1535 0%, #111b40 55%, #0d1a3a 100%)",
          border: "1px solid rgba(99,130,255,0.25)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 10% 50%, rgba(123,92,255,0.12) 0%, transparent 60%)" }} />

        <div className="relative z-10 flex items-center gap-5 justify-between">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden ring-2 ring-white/20">
                {profile?.profilePhotoUrl ? (
                  <Image src={profile.profilePhotoUrl} alt={profile.fullName} fill sizes="96px" unoptimized className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-2xl font-bold text-white">
                    {profile?.fullName?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-ink-muted text-sm">Welcome back,</p>

                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${profile?.isActive
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                    : "bg-white/8 text-ink-muted border border-white/15"
                    }`}
                >
                  {profile?.isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  )}
                  {profile?.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <h1 className="font-display text-2xl lg:text-3xl font-bold text-white leading-tight">
                {profile?.fullName || "Member"}
              </h1>

              <p className="text-ink-muted text-sm mt-2">
                Member ID:{" "}
                <span className="text-ink font-medium">
                  {profile?.memberId || "—"}
                </span>
              </p>
            </div>
          </div>

          {/* Welcome Banner or Shield */}
          {bannerUrl ? (
            <div className="relative h-24 w-48 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <Image src={bannerUrl} alt="Welcome Banner" fill sizes="192px" unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="hidden sm:flex shrink-0 items-center justify-center w-24 h-24 lg:w-32 lg:h-32 relative select-none pointer-events-none">
              <div className="absolute inset-0 pointer-events-none rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, rgba(0,229,255,0.4) 0%, transparent 70%)" }} />
              <div className="absolute inset-3 rounded-full border border-neon-cyan/20 animate-pulse" />
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl flex items-center justify-center font-display font-black text-xl lg:text-2xl"
                style={{
                  background: "linear-gradient(145deg, #1a2a5e, #0e1a40)",
                  border: "2px solid rgba(218,165,32,0.6)",
                  boxShadow: "0 4px 20px rgba(0,229,255,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
                  color: "#f5c842",
                }}>
                NV
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Market Prediction Card ── */}
      <div className="mb-6 glass-card p-5 border border-neon-cyan/20">
        {accountState === "inactive" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-display font-bold text-white mb-1">
                🔒 Your Prediction Window is Locked
              </h3>
              <p className="text-xs text-ink-muted">
                Activate your account to unlock Daily Predictions and become eligible for monthly Return Plans.
              </p>
            </div>
            <Link
              href="/unlock-access"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-neon-cyan text-black hover:bg-neon-cyan/80 transition shrink-0 text-center"
            >
              Activate Account
            </Link>
          </div>
        )}

        {accountState === "investment_pending" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-display font-bold text-white mb-1">
                💰 Investment Required
              </h3>
              <p className="text-xs text-ink-muted">
                Your account is active, but Daily Predictions become available only after completing the minimum investment amount configured by the Admin.
              </p>
            </div>
            <Link
              href="/invest"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-neon-cyan text-black hover:bg-neon-cyan/80 transition shrink-0 text-center"
            >
              Invest Now
            </Link>
          </div>
        )}

        {accountState === "prediction_locked" && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="mb-3">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-neon-magenta/25 text-neon-magenta">
                  Today's Return: 0% Return
                </span>
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-1">
                🤣 Oops! You missed Daily Predictions three times this month.
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Your Prediction Window has been locked for the rest of this month.<br />
                Don't worry—everything will automatically unlock on the 1st of next month. 🚀
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[200px]">
              <span className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-2 block">
                Next Prediction Window Opens In
              </span>
              <div className="grid grid-cols-4 gap-2 text-white font-mono">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-neon-cyan">{timeLeft.days}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Days</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-neon-cyan">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Hours</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-neon-cyan">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Minutes</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-neon-cyan">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Seconds</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {accountState === "already_submitted" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-neon-cyan/25 text-neon-cyan">
                Today's Return: {monthlyMissCount <= 1 ? "7% Return Plan" : "5% Return Plan"}
              </span>
              <p className="text-md font-display font-medium mt-3 mb-1 text-white">
                {predQuestion ? `"${predQuestion.questionText}"` : "Today's prediction question"}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-muted">
                <span>Monthly Misses: <strong className="text-white font-mono">{monthlyMissCount}</strong></span>
                <span>•</span>
                <span>Predictions Submitted: <strong className="text-neon-cyan font-mono">{predictionDaysCount} Days</strong></span>
                <span>•</span>
                <span>Remaining Free Misses: <strong className="text-yellow-400 font-mono">{remainingFreeMisses}</strong></span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-right shrink-0">
              <span className="text-xs text-neon-green font-bold flex items-center gap-1">
                ✓ Prediction Submitted Successfully
              </span>
              {predSubmission && (
                <span className="text-[10px] text-ink-muted">
                  You predicted: <strong className="text-neon-cyan uppercase font-bold">{predSubmission.answer}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {accountState === "prediction_available" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-neon-cyan/25 text-neon-cyan">
                Today's Return: {monthlyMissCount <= 1 ? "7% Return Plan" : "5% Return Plan"}
              </span>
              {monthlyMissCount === 2 && (
                <div className="mt-2 text-xs text-yellow-400 font-semibold">
                  ⚠️ You have missed two Daily Predictions this month. Your Return Plan has been adjusted from the 7% Return Plan to the 5% Return Plan for the remainder of this month.
                </div>
              )}
              <p className="text-md font-display font-medium mt-3 mb-1 text-white">
                {predQuestion ? `"${predQuestion.questionText}"` : "Today's prediction question is being generated..."}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-muted">
                <span>Monthly Misses: <strong className="text-white font-mono">{monthlyMissCount}</strong></span>
                <span>•</span>
                <span>Predictions Submitted: <strong className="text-neon-cyan font-mono">{predictionDaysCount} Days</strong></span>
                <span>•</span>
                <span>Remaining Free Misses: <strong className="text-yellow-400 font-mono">{remainingFreeMisses}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {predQuestion ? (
                <div className="flex gap-2">
                  <button
                    disabled={submittingPrediction}
                    onClick={() => handlePredict("yes")}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-neon-green text-black hover:bg-neon-green/80 disabled:opacity-50 transition"
                  >
                    YES
                  </button>
                  <button
                    disabled={submittingPrediction}
                    onClick={() => handlePredict("no")}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-neon-magenta text-white hover:bg-neon-magenta/80 disabled:opacity-50 transition"
                  >
                    NO
                  </button>
                </div>
              ) : (
                <span className="text-xs text-ink-muted italic">Waiting for daily generation...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {offers.length > 0 && (
        <div className="flex gap-3 overflow-x-auto mb-6 pb-1">
          {offers.map((o) => (
            <div key={o._id} className="shrink-0 glass-card border-neon-magenta/40 p-4 min-w-[220px]">
              <p className="text-sm font-semibold text-neon-magenta">{o.title}</p>
              <p className="text-xs text-ink-muted mt-1">{o.message}</p>
              {o.price > 0 && (
                <p className="text-sm font-bold text-neon-cyan mt-2">${o.price.toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="stat-card group">
            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 md:mb-3 ${
                c.isPending
                  ? "bg-yellow-400/20"
                  : c.isPendingReturnsLevel
                  ? "bg-neon-magenta/20"
                  : c.isBooster
                  ? "bg-amber-500/20"
                  : "bg-gradient-to-br from-neon-violet to-neon-cyan"
              }`}>
                <c.icon size={18} className={
                  c.isPending
                    ? "text-yellow-400"
                    : c.isPendingReturnsLevel
                    ? "text-neon-magenta"
                    : c.isBooster
                    ? "text-amber-400 animate-pulse"
                    : "text-base"
                } />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-start">
                <p className="text-xs text-ink-muted leading-tight">{c.label}</p>
                <p className={`font-display text-xl font-bold mt-1 group-hover:text-neon-cyan transition leading-tight ${c.color || ""}`}>
                  {c.prefix}{typeof c.value === "number" ? c.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : c.value}
                </p>
                {c.isPending ? (
                  <div className="mt-2 text-[10px] text-ink-muted space-y-0.5 border-t border-white/5 pt-1.5 leading-snug w-full">
                    <div>Today's Return: <span className="text-yellow-400 font-semibold">{currentReturnPlan}% Return Plan</span></div>
                    <div>Active Investment: <span className="text-white font-mono">${totalActiveInvestment.toLocaleString()}</span></div>
                  </div>
                ) : null}
                {c.isPendingReturnsLevel ? (
                  <div className="mt-2 text-[10px] text-ink-muted space-y-0.5 border-t border-white/5 pt-1.5 leading-snug w-full">
                    <div>Earned (Lifetime): <span className="text-neon-magenta font-semibold">${(user?.totalReturnsLevelIncomeEarned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div>Closing: <span className="text-white">1st of Month</span></div>
                  </div>
                ) : null}
                {c.isBooster ? (
                  <div className="mt-2 text-[10px] text-ink-muted space-y-0.5 border-t border-white/5 pt-1.5 leading-snug w-full">
                    <div>Status: <span className="text-amber-400 font-semibold">{stats?.booster?.status || "In Progress"}</span></div>
                    <div>Directs (Window): <span className="text-white font-semibold">{stats?.booster?.directsCount || 0}</span></div>
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DirectProgressCard directCount={stats?.direct ?? 0} isActive={profile?.isActive ?? false} directsList={stats?.directsList || []} />
        <BoosterProgressCard booster={stats?.booster} />
      </div>

      {/* ── Activity graph ── */}
      {/* <TransactionChart transactions={transactions} /> */}

      <div className="glass-card p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Recent Transactions</h2>
          <Link href="/wallet" className="text-xs text-neon-cyan hover:underline">View all →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">No transactions yet. Activity will appear here once it happens.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 3).map((t) => (
              <div key={t._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.direction === "credit" ? "bg-neon-green/15 text-neon-green" : "bg-neon-magenta/15 text-neon-magenta"
                    }`}>
                    {t.direction === "credit" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{t.type.replace(/_/g, " ")}</p>
                    {t.note && <p className="text-xs text-neon-cyan mt-0.5">{t.note}</p>}
                    <p className="text-[10px] text-ink-muted">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${t.direction === "credit" ? "text-neon-green" : "text-ink"}`}>
                  {t.direction === "credit" ? "+" : "-"}${t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Returns Monthly Closing Details & History ── */}
      <div className="glass-card p-5 mt-6">
        <h2 className="font-display font-semibold mb-4 text-white">Returns Monthly Closing System</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6">
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-ink-muted">Returns Daily Earnings</p>
            <p className="font-display text-lg font-bold text-yellow-400 mt-1">
              ${(stats?.returnsDailyEarnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[9px] text-ink-muted">Locked daily returns</span>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-ink-muted">Current Closing Cycle</p>
            <p className="font-display text-lg font-bold text-white mt-1">
              {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </p>
            <span className="text-[9px] text-ink-muted">Accumulation period</span>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-ink-muted">Next Closing Date</p>
            <p className="font-display text-lg font-bold text-neon-cyan mt-1">
              {(() => {
                const now = new Date();
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                return nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              })()}
            </p>
            <span className="text-[9px] text-ink-muted">Auto credit execution</span>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-ink-muted">Last Closing Amount</p>
            <p className="font-display text-lg font-bold text-neon-green mt-1">
              ${(stats?.returnsClosingHistory?.[0]?.totalReturn ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[9px] text-ink-muted">
              {stats?.lastReturnsClosingAt ? `Settled on ${new Date(stats.lastReturnsClosingAt).toLocaleDateString()}` : "No previous settlement"}
            </span>
          </div>
        </div>

        {/* Closing History Table */}
        <h3 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">Settlement History</h3>
        {!stats?.returnsClosingHistory || stats.returnsClosingHistory.length === 0 ? (
          <p className="text-xs text-ink-muted italic py-4 text-center">No closing history records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 text-ink-muted font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-2">Period</th>
                  <th className="py-2 px-2">Active Days</th>
                  <th className="py-2 px-2">Total Yield</th>
                  <th className="py-2 px-2">Settlement Date</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.returnsClosingHistory.map((h: any) => (
                  <tr key={h._id} className="hover:bg-white/5">
                    <td className="py-2.5 px-2 font-mono text-white">{h.closingPeriod}</td>
                    <td className="py-2.5 px-2 text-white">{h.activeDays} Days</td>
                    <td className="py-2.5 px-2 text-neon-green font-bold">${h.totalReturn.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-ink-muted">{new Date(h.closingDate).toLocaleDateString()}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        h.status === "Success" ? "bg-neon-green/20 text-neon-green" : "bg-neon-magenta/20 text-neon-magenta"
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card p-5 mt-6">
        <h2 className="font-display font-semibold mb-4">Business Details</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-ink-muted">Direct</p><p className="font-semibold mt-0.5">{stats?.direct ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Total Team</p><p className="font-semibold mt-0.5">{stats?.totalTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Left Team</p><p className="font-semibold mt-0.5">{stats?.leftTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Right Team</p><p className="font-semibold mt-0.5">{stats?.rightTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Left Active Team</p><p className="font-semibold mt-0.5 text-neon-green">{stats?.leftActiveTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Right Active Team</p><p className="font-semibold mt-0.5 text-neon-green">{stats?.rightActiveTeam ?? 0}</p></div>
          <div><p className="text-xs text-ink-muted">Weaker Leg</p><p className="font-semibold mt-0.5 text-neon-magenta">{(stats?.leftActiveTeam ?? 0) >= (stats?.rightActiveTeam ?? 0) ? "Right" : "Left"}</p></div>
          <div><p className="text-xs text-ink-muted">Strong Leg</p><p className="font-semibold mt-0.5 text-neon-green">{(stats?.leftActiveTeam ?? 0) >= (stats?.rightActiveTeam ?? 0) ? "Left" : "Right"}</p></div>

          <div><p className="text-xs text-ink-muted">Left Carry Forward</p><p className="font-semibold mt-0.5">${(stats?.leftCarryForward ?? profile?.leftCarryForward ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Right Carry Forward</p><p className="font-semibold mt-0.5">${(stats?.rightCarryForward ?? profile?.rightCarryForward ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Left Current Business</p><p className="font-semibold mt-0.5">${(stats?.leftCurrentBusiness ?? profile?.leftCurrentBusiness ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Right Current Business</p><p className="font-semibold mt-0.5">${(stats?.rightCurrentBusiness ?? profile?.rightCurrentBusiness ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Left Total Business</p><p className="font-semibold mt-0.5">${(stats?.leftTotalBusiness ?? profile?.leftTotalBusiness ?? 0).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-muted">Right Total Business</p><p className="font-semibold mt-0.5">${(stats?.rightTotalBusiness ?? profile?.rightTotalBusiness ?? 0).toLocaleString()}</p></div>
        </div>
      </div>
    </DashboardShell>
  );
}
