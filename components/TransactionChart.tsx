"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useMemo, useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tx = {
  _id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  currency: string;
  createdAt: string;
};

interface ChartPoint {
  date: string;          // "DD MMM"
  income: number;        // cumulative earnings that day
  expense: number;       // cumulative debits that day
  balance: number;       // running net balance (income - expense)
  incomeDay: number;     // earnings on that day only
  expenseDay: number;    // debits on that day only
  incomePercent: number;
  expensePercent: number;
  balancePercent: number;
}

// Helper to identify earnings/income transactions
function isIncomeTransaction(tx: { type: string; direction: string }): boolean {
  const incomeTypes = [
    "referral_income",
    "matching_income",
    "returns_income",
    "daily_return",
    "level_income",
    "reward_income",
    "share_reward",
    "booster_income",
    "refund"
  ];
  return tx.direction === "credit" && incomeTypes.includes(tx.type);
}

// Helper to identify expense/spend/outflow transactions
function isExpenseTransaction(tx: { direction: string }): boolean {
  return tx.direction === "debit";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as ChartPoint;

  return (
    <div className="bg-[#131A33]/95 backdrop-blur-xl border border-white/15 rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold text-ink mb-2">{label}</p>
      {[
        { key: "incomePercent", label: "Income", color: "#22c55e", raw: data?.incomeDay },
        { key: "expensePercent", label: "Expense", color: "#ef4444", raw: data?.expenseDay },
        { key: "balancePercent", label: "Net Balance", color: "#eab308", raw: data?.balance },
      ].map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
            <span className="text-ink-muted">{row.label}</span>
          </div>
          <div className="text-right">
            <span style={{ color: row.color }} className="font-bold">
              {(data as any)?.[row.key]?.toFixed(1)}%
            </span>
            <span className="text-ink-muted ml-1">
              ({row.raw != null ? (row.raw >= 0 ? "+" : "") + row.raw.toLocaleString() : "0"})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-5 pt-1 text-xs">
      {[
        { color: "#22c55e", label: "Income" },
        { color: "#ef4444", label: "Expense" },
        { color: "#eab308", label: "Balance" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="w-4 h-[2px] rounded-full" style={{ background: item.color }} />
          <span className="text-ink-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Helper: bucket transactions by day ──────────────────────────────────────
function buildChartData(transactions: Tx[]): ChartPoint[] {
  if (!transactions.length) {
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    return [{ date: today, income: 0, expense: 0, balance: 0, incomeDay: 0, expenseDay: 0, incomePercent: 100, expensePercent: 0, balancePercent: 100 }];
  }

  // Sort oldest → newest
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group by date string
  const byDay = new Map<string, { incomeDay: number; expenseDay: number }>();
  for (const tx of sorted) {
    const dateStr = new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const prev = byDay.get(dateStr) ?? { incomeDay: 0, expenseDay: 0 };
    if (isIncomeTransaction(tx)) {
      prev.incomeDay += tx.amount;
    } else if (isExpenseTransaction(tx)) {
      prev.expenseDay += tx.amount;
    }
    byDay.set(dateStr, prev);
  }

  // Build cumulative series
  let cumIncome = 0;
  let cumExpense = 0;
  const raw: Omit<ChartPoint, "incomePercent" | "expensePercent" | "balancePercent">[] = [];

  for (const [date, { incomeDay, expenseDay }] of Array.from(byDay.entries())) {
    cumIncome += incomeDay;
    cumExpense += expenseDay;
    const balance = cumIncome - cumExpense;
    raw.push({ date, income: cumIncome, expense: cumExpense, balance, incomeDay, expenseDay });
  }

  // Normalize to percentage of max absolute value for each series (0-100 scale)
  const maxIncome = Math.max(...raw.map((d) => d.income), 1);
  const maxExpense = Math.max(...raw.map((d) => d.expense), 1);
  const maxAbsBalance = Math.max(...raw.map((d) => Math.abs(d.balance)), 1);

  return raw.map((d) => ({
    ...d,
    incomePercent: (d.income / maxIncome) * 100,
    expensePercent: (d.expense / maxExpense) * 100,
    balancePercent: 50 + (d.balance / maxAbsBalance) * 50,
  }));
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function TransactionChart({ transactions }: { transactions: Tx[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => buildChartData(transactions), [transactions]);
  const hasData = transactions.length > 0;

  // ─── Calculate Dynamic Summary Statistics ───
  const { totalIncome, totalExpense, netBalance, incomePct, expensePct, balancePct } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (isIncomeTransaction(tx)) {
        income += tx.amount;
      } else if (isExpenseTransaction(tx)) {
        expense += tx.amount;
      }
    }
    const balance = income - expense;

    // Income % represents baseline earnings (always 100% if income > 0)
    const inPct = income > 0 ? 100 : 0;
    const exPct = income > 0 ? (expense / income) * 100 : 0;
    const balPct = income > 0 ? (balance / income) * 100 : 0;

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: balance,
      incomePct: parseFloat(inPct.toFixed(1)),
      expensePct: parseFloat(exPct.toFixed(1)),
      balancePct: parseFloat(balPct.toFixed(1)),
    };
  }, [transactions]);

  return (
    <div className="glass-card p-5 mt-6 relative overflow-hidden">
      {/* accent strip */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-neon-green via-yellow-500 to-neon-magenta opacity-80" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold">Activity Overview</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {hasData
              ? "Your income, expense & net balance trend"
              : "No transactions yet — chart will populate as activity happens"}
          </p>
        </div>
        {!hasData && (
          <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-ink-muted">
            Empty State
          </span>
        )}
      </div>

      {/* Graph Area */}
      <div className="h-[220px] w-full">
        {!mounted ? (
          <div className="w-full h-full bg-white/5 animate-pulse rounded-xl flex items-center justify-center text-xs text-ink-muted">
            Loading chart...
          </div>
        ) : !hasData ? (
          <div className="w-full h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.02]">
            <p className="text-sm font-semibold text-ink-muted">No Transaction Records Found</p>
            <p className="text-xs text-ink-muted/70 mt-1 max-w-[280px]">
              Once deposit, investment, or income transactions are completed, your activity graph will render here automatically.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

              <XAxis
                dataKey="date"
                tick={{ fill: "#8888aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "#8888aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />

              <ReferenceLine
                y={50}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 4"
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }} />

              <Line
                type="monotone"
                dataKey="incomePercent"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
              />

              <Line
                type="monotone"
                dataKey="expensePercent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              />

              <Line
                type="monotone"
                dataKey="balancePercent"
                stroke="#eab308"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: "#eab308", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <div className="mt-2">
          <CustomLegend />
        </div>
      )}

      {/* ─── Detailed Financial Data Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/5">
        {/* Income Card */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">Total Income</p>
              <span className="text-xs font-bold text-neon-green font-mono">{incomePct}%</span>
            </div>
            <p className="text-lg font-bold font-display text-white mt-1">
              ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-neon-green h-full rounded-full transition-all duration-500" style={{ width: `${incomePct}%` }} />
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">Total Expense</p>
              <span className="text-xs font-bold text-neon-magenta font-mono">{expensePct}%</span>
            </div>
            <p className="text-lg font-bold font-display text-white mt-1">
              ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-neon-magenta h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, expensePct))}%` }} />
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">Net Balance</p>
              <span className="text-xs font-bold text-yellow-400 font-mono">
                {balancePct}%
              </span>
            </div>
            <p className={`text-lg font-bold font-display mt-1 ${netBalance >= 0 ? "text-yellow-400" : "text-neon-magenta"}`}>
              {netBalance < 0 ? "-" : ""}${Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, balancePct))}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
