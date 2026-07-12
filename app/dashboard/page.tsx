"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/lib/AuthContext";
import { Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Clock, Briefcase, X, Calendar } from "lucide-react";
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
  const [hasDailyReturnRecordToday, setHasDailyReturnRecordToday] = useState(false);

  const [user, setUser] = useState<any>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/user/predictions/history");
      if (res.ok) {
        const json = await res.json();
        setHistoryData(json.history || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (showHistoryModal) {
      void loadHistory();
    }
  }, [showHistoryModal]);

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
          setHasDailyReturnRecordToday(pred.hasDailyReturnRecordToday || false);
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
            setHasDailyReturnRecordToday(pred.hasDailyReturnRecordToday || false);
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

  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const activeDailyYield = (totalActiveInvestment * 0.233) / 100;
  const isPredictedToday = !!predSubmission;
  const todayRoiYield = isPredictedToday ? ((totalActiveInvestment * currentReturnPlan) / 100) : 0;
  const todayRoiDailyYield = isPredictedToday ? ((totalActiveInvestment * (currentReturnPlan / daysInMonth)) / 100) : 0;
  
  const pendingDailyAmt = (dailyReturnPending || user?.dailyReturnPending || 0) + (isPredictedToday && !hasDailyReturnRecordToday ? todayRoiYield : 0);
  const totalPendingReturnsAndLevel = pendingDailyAmt + (user?.pendingReturnsLevelIncome ?? 0);

  const todayInvReturnYield = isPredictedToday ? activeDailyYield : 0;
  let displayedTotalInvReturn = (user?.totalInvestmentReturn ?? profile?.totalInvestmentReturn ?? 0) + (isPredictedToday && !hasDailyReturnRecordToday ? todayInvReturnYield : 0);
  if (displayedTotalInvReturn === 0 && isPredictedToday) {
    displayedTotalInvReturn = todayInvReturnYield;
  }

  const totalEarningVal =
    (user?.totalReferralIncome ?? profile?.totalReferralIncome ?? 0) +
    (user?.totalMatchingIncome ?? profile?.totalMatchingIncome ?? 0) +
    (user?.totalReturnsIncome ?? profile?.totalReturnsIncome ?? 0) +
    (user?.totalLevelIncome ?? profile?.totalLevelIncome ?? 0) +
    (user?.totalRewardIncome ?? profile?.totalRewardIncome ?? 0) +
    (user?.totalReturnsLevelIncomeEarned ?? 0) +
    (user?.totalBoosterIncome ?? 0);

  interface DashboardCard {
    label: string;
    value: string | number;
    icon: any;
    prefix?: string;
    href?: string;
    color?: string;
    isPending?: boolean;
    isTotalInvestmentReturn?: boolean;
    isPendingReturnsLevel?: boolean;
    isBooster?: boolean;
    onClick?: () => void;
  }

  const cards: DashboardCard[] = [
    { label: "Main Balance", value: user?.walletBalance ?? profile?.walletBalance ?? 0, icon: Wallet, prefix: "$", href: "/wallet", color: "text-neon-cyan" },
    { label: "Total Earning", value: totalEarningVal, icon: TrendingUp, prefix: "$", href: "/income", color: "text-neon-green" },
    { label: "Total Withdrawal", value: user?.totalWithdrawn ?? profile?.totalWithdrawn ?? 0, icon: ArrowUpRight, prefix: "$", href: "/withdrawal", color: "" },
    { label: "Active Investment", value: totalActiveInvestment || user?.totalInvestment || 0, icon: Briefcase, prefix: "$", href: "/invest", color: "text-neon-green" },
    { label: "Daily Returns", value: todayRoiYield, icon: Clock, prefix: "$", href: "#", color: "text-yellow-400", isPending: true, onClick: () => setShowHistoryModal(true) },
    { label: "Total Investment Return", value: displayedTotalInvReturn, icon: Wallet, prefix: "$", href: "/wallet", color: "text-neon-cyan", isTotalInvestmentReturn: true },
    { label: "Daily Returns Today", value: activeDailyYield + todayRoiDailyYield, icon: Wallet, prefix: "$", href: "/wallet", color: "text-neon-cyan" },
    { label: "Total Daily Returns", value: totalPendingReturnsAndLevel, icon: Clock, prefix: "$", href: "#", color: "text-neon-magenta", isPendingReturnsLevel: true, onClick: () => setShowHistoryModal(true) },
    { label: "Total Withdrawal Returns", value: user?.withdrawalReturnsWallet ?? profile?.withdrawalReturnsWallet ?? 0, icon: Wallet, prefix: "$", href: "/wallet", color: "text-neon-green" },
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

      // Reload me stats and predictions state
      const [predRes, userRes] = await Promise.all([
        fetch("/api/user/predictions", { cache: "no-store" }),
        fetch("/api/user/me", { cache: "no-store" })
      ]);

      if (userRes.ok) {
        const me = await userRes.json();
        setStats(me.stats);
        setUser(me.user);
        setDailyReturnPending(me.stats?.dailyReturnPending || 0);
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
        setHasDailyReturnRecordToday(pred.hasDailyReturnRecordToday || false);
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
              <div className="relative w-20 h-20 lg:w-24 lg:h-24 overflow-hidden rounded-full ring-2 ring-white/20">
                {profile?.profilePhotoUrl ? (
                  <Image
                    src={profile.profilePhotoUrl}
                    alt={profile.fullName}
                    fill
                    sizes="96px"
                    unoptimized
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan text-2xl font-bold text-white">
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
      <div className="glass-card mb-6 py-4 px-5 md:py-5 md:px-6 relative overflow-hidden text-center flex flex-col items-center">

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#00E5FF]/40 bg-gradient-to-r from-[#00E5FF]/10 to-[#7B5CFF]/5 shadow-[0_0_10px_rgba(0,229,255,0.08)] mb-3 shrink-0">
          <div className="w-4 h-4 rounded-full bg-[#00E5FF]/20 flex items-center justify-center border border-[#00E5FF]/40 text-[#00E5FF]">
            <TrendingUp size={10} />
          </div>
          <span className="text-[9px] md:text-[10px] font-semibold tracking-wider text-white uppercase font-display">
            Daily Prediction - Daily Returns
          </span>
        </div>

        {accountState === "inactive" && (
          <div className="flex flex-col items-center gap-2.5 w-full max-w-xl py-2">
            <h3 className="text-base font-display font-bold text-white">
              🔒 Your Prediction Window is Locked
            </h3>
            <p className="text-[11px] text-ink-muted max-w-md leading-relaxed">
              Activate your account to unlock Daily Predictions and become eligible for monthly Return Plans.
            </p>
            <Link
              href="/unlock-access"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-neon-cyan text-black hover:bg-neon-cyan/80 transition duration-300 shadow-[0_0_12px_rgba(0,229,255,0.25)]"
            >
              Activate Account
            </Link>
          </div>
        )}

        {accountState === "investment_pending" && (
          <div className="flex flex-col items-center gap-2.5 w-full max-w-xl py-2">
            <h3 className="text-base font-display font-bold text-white">
              💰 Investment Required
            </h3>
            <p className="text-[11px] text-ink-muted max-w-md leading-relaxed">
              Your account is active, but Daily Predictions become available only after completing the minimum investment amount configured by the Admin.
            </p>
            <Link
              href="/invest"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-neon-cyan text-black hover:bg-neon-cyan/80 transition duration-300 shadow-[0_0_12px_rgba(0,229,255,0.25)]"
            >
              Invest Now
            </Link>
          </div>
        )}

        {accountState === "prediction_locked" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-xl py-2">
            <div className="flex flex-col items-center">
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-neon-magenta/25 text-neon-magenta mb-2">
                Today's Return: 0% Return
              </span>
              <h3 className="text-base font-display font-bold text-white mb-1">
                🤣 Oops! You missed Daily Predictions three times this month.
              </h3>
              <p className="text-[11px] text-ink-muted leading-relaxed max-w-md">
                Your Prediction Window has been locked for the rest of this month. Don't worry—everything will unlock on the 1st. 🚀
              </p>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-3 text-center min-w-[220px]">
              <span className="text-[9px] text-ink-muted uppercase tracking-wider font-semibold mb-1 block">
                Next Prediction Window Opens In
              </span>
              <div className="grid grid-cols-4 gap-2 text-white font-mono">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-neon-cyan">{timeLeft.days}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Days</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-neon-cyan">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Hours</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-neon-cyan">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Min</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-neon-cyan">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <span className="text-[8px] text-ink-muted uppercase">Sec</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {accountState === "already_submitted" && (
          <div className="flex flex-col items-center w-full">
            {/* Question Text */}
            <h2 className="text-base md:text-lg font-medium text-white tracking-wide max-w-2xl leading-relaxed font-serif mb-2">
              {predQuestion ? `"${predQuestion.questionText}"` : `"Today's Prediction Question"`}
            </h2>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-2 md:gap-6 my-2 text-center w-full">
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium">Monthly Misses</span>
                <span className="text-sm md:text-base font-bold text-white mt-0.5">{monthlyMissCount}</span>
              </div>
              <span className="text-zinc-600 text-xs">•</span>
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium">Predictions Submitted</span>
                <span className="text-sm md:text-base font-bold text-[#00E5FF] mt-0.5">
                  {predictionDaysCount} <span className="text-[#00FFA3] text-[10px] font-medium">Days</span>
                </span>
              </div>
              <span className="text-zinc-600 text-xs">•</span>
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium">Remaining Free Misses</span>
                <span className="text-sm md:text-base font-bold text-yellow-400 mt-0.5">{remainingFreeMisses}</span>
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="w-full max-w-xl rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-transparent p-3 flex flex-col items-center justify-center gap-0.5 mt-2.5 shadow-[0_0_15px_rgba(16,185,129,0.03)] shrink-0">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] md:text-xs">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Prediction Submitted Successfully</span>
              </div>
              {predSubmission && (
                <span className="text-[9px] md:text-[10px] text-zinc-300 font-medium">
                  You predicted: <span className="text-[#00E5FF] font-bold uppercase">{predSubmission.answer}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {accountState === "prediction_available" && (
          <div className="flex flex-col items-center w-full">
            {/* Question Text */}
            <h2 className="text-base md:text-lg font-medium text-white tracking-wide max-w-2xl leading-relaxed font-serif mb-2">
              {predQuestion ? `"${predQuestion.questionText}"` : `"Today's Prediction Question"`}
            </h2>

            {monthlyMissCount === 2 && (
              <div className="mb-2 text-[10px] text-yellow-400 font-semibold px-3 py-1 border border-yellow-400/20 bg-yellow-400/5 rounded-lg max-w-md">
                ⚠️ You missed two predictions. Yield rate adjusted to 5% Plan for this month.
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-2 md:gap-6 my-2 text-center w-full">
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium">Monthly Misses</span>
                <span className="text-sm md:text-base font-bold text-white mt-0.5">{monthlyMissCount}</span>
              </div>
              <span className="text-zinc-600 text-xs">•</span>
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium">Predictions Submitted</span>
                <span className="text-sm md:text-base font-bold text-[#00E5FF] mt-0.5">
                  {predictionDaysCount} <span className="text-[#00FFA3] text-[10px] font-medium">Days</span>
                </span>
              </div>
              <span className="text-zinc-600 text-xs">•</span>
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-zinc-400 font-medium">Remaining Free Misses</span>
                <span className="text-sm md:text-base font-bold text-yellow-400 mt-0.5">{remainingFreeMisses}</span>
              </div>
            </div>

            {/* Bottom Actions Container */}
            <div className="w-full max-w-xl rounded-xl border border-[#7B5CFF]/30 bg-gradient-to-b from-[#7B5CFF]/10 to-transparent p-3 flex flex-col items-center justify-center gap-3 mt-2.5 shrink-0">
              {predQuestion ? (
                <div className="flex gap-3 w-full">
                  <button
                    disabled={submittingPrediction}
                    onClick={() => handlePredict("yes")}
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-[#00FFA3] text-black shadow-[0_0_12px_rgba(0,255,163,0.25)] hover:shadow-[0_0_20px_rgba(0,255,163,0.4)] transition duration-300 disabled:opacity-50 uppercase tracking-wider"
                  >
                    YES
                  </button>
                  <button
                    disabled={submittingPrediction}
                    onClick={() => handlePredict("no")}
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-rose-500 to-[#FF3CAC] text-white shadow-[0_0_12px_rgba(255,60,172,0.25)] hover:shadow-[0_0_20px_rgba(255,60,172,0.4)] transition duration-300 disabled:opacity-50 uppercase tracking-wider"
                  >
                    NO
                  </button>
                </div>
              ) : (
                <span className="text-xs text-ink-muted italic py-1">Waiting for daily generation...</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => {
          const CardContent = (
            <div className="flex flex-row items-start gap-4 w-full text-left">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.isPending
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
                <p className={`font-display text-lg md:text-xl font-bold mt-1 group-hover:text-neon-cyan transition leading-tight ${c.color || ""}`}>
                  {c.prefix}{typeof c.value === "number" ? c.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : c.value}
                </p>
                {c.isPending ? (
                  <div className="mt-2 text-[10px] text-ink-muted space-y-0.5 border-t border-white/5 pt-1.5 leading-snug w-full">
                    <div>Today's Return Plan: <span className="text-yellow-400 font-semibold">{currentReturnPlan}% Return Plan</span></div>
                    <div>Active Investment: <span className="text-white font-mono">${totalActiveInvestment.toLocaleString()}</span></div>
                  </div>
                ) : null}
                {c.isTotalInvestmentReturn ? (
                  <div className="mt-2 text-[10px] text-ink-muted space-y-0.5 border-t border-white/5 pt-1.5 leading-snug w-full">
                    <div>Today's Yield (0.233%): <span className="text-neon-green font-bold">${((totalActiveInvestment * 0.233) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></div>
                    <div>Monthly Plan: <span className="text-yellow-400 font-semibold">7.00% Plan</span></div>
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
          );

          if (c.onClick) {
            return (
              <button key={c.label} onClick={c.onClick} className="stat-card group py-4 px-5 w-full">
                {CardContent}
              </button>
            );
          }

          return (
            <Link key={c.label} href={c.href || "#"} className="stat-card group py-4 px-5">
              {CardContent}
            </Link>
          );
        })}
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
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${h.status === "Success" ? "bg-neon-green/20 text-neon-green" : "bg-neon-magenta/20 text-neon-magenta"
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

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-3xl w-full p-6 relative max-h-[85vh] flex flex-col border border-white/10 shadow-2xl">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-white transition"
            >
              <X size={20} />
            </button>

            <h3 className="font-display font-semibold text-lg text-white mb-2 flex items-center gap-2">
              <Calendar className="text-neon-cyan" size={20} /> Returns & Prediction History
            </h3>
            <p className="text-xs text-ink-muted mb-4 border-b border-white/5 pb-2">
              Detailed history of prediction submissions, daily ROI earnings, and level commissions.
            </p>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {historyLoading ? (
                <div className="py-12 text-center text-sm text-ink-muted animate-pulse">
                  Loading prediction history...
                </div>
              ) : historyData.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink-muted italic">
                  No prediction submissions or daily return history found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-ink-muted font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Question</th>
                        <th className="py-2 px-2">Answered At</th>
                        <th className="py-2 px-2 text-center">Prediction</th>
                        <th className="py-2 px-2 text-right">Daily ROI</th>
                        <th className="py-2 px-2 text-right">Level Income</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {historyData.map((item) => (
                        <tr key={item.date} className="hover:bg-white/5 border-b border-white/5 last:border-0">
                          <td className="py-3 px-2 font-mono text-white whitespace-nowrap">{item.date}</td>
                          <td className="py-3 px-2 text-ink-muted max-w-[200px] truncate" title={item.questionText}>
                            {item.questionText}
                          </td>
                          <td className="py-3 px-2 text-ink-muted whitespace-nowrap font-mono">
                            {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—"}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.answer === "yes"
                              ? "bg-neon-green/10 text-neon-green"
                              : item.answer === "no"
                                ? "bg-neon-magenta/10 text-neon-magenta"
                                : "bg-white/5 text-ink-muted"
                              }`}>
                              {item.answer}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-neon-green font-mono font-bold">
                            {item.roiProfit > 0 ? `$${item.roiProfit.toFixed(4)}` : "—"}
                          </td>
                          <td className="py-3 px-2 text-right text-neon-magenta font-mono font-bold">
                            {item.levelIncome > 0 ? `$${item.levelIncome.toFixed(4)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-white/10 hover:bg-white/5 text-white transition bg-white/5 hover:border-white/20"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
