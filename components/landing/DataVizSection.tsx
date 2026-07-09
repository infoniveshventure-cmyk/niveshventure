"use client";

import { useRef } from "react";
import { useInView, motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

const monthlyGrowthData = [
  { month: "Jan", value: 8200 },
  { month: "Feb", value: 11400 },
  { month: "Mar", value: 9800 },
  { month: "Apr", value: 14600 },
  { month: "May", value: 18200 },
  { month: "Jun", value: 22800 },
  { month: "Jul", value: 28500 },
];

const membersData = [
  { month: "Jan", active: 12000, new: 1800 },
  { month: "Feb", active: 15500, new: 3200 },
  { month: "Mar", active: 19200, new: 2900 },
  { month: "Apr", active: 25800, new: 4100 },
  { month: "May", active: 33400, new: 5800 },
  { month: "Jun", active: 42100, new: 6200 },
  { month: "Jul", active: 50000, new: 7200 },
];

const distributionData = [
  { name: "Real Estate", value: 32, color: "#7B5CFF" },
  { name: "Forex", value: 24, color: "#00E5FF" },
  { name: "Digital Assets", value: 21, color: "#00FFA3" },
  { name: "IPO", value: 14, color: "#FF3CAC" },
  { name: "International", value: 9, color: "#FFD700" },
];

const customTooltipStyle = {
  background: "rgba(10,14,26,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.75rem",
  color: "#E8E8F0",
  fontSize: "12px",
};

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div className="landing-card p-6 h-full">
      <div className="mb-5">
        <h3 className="font-display font-bold text-white text-lg">{title}</h3>
        <p className="text-xs text-white mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export default function DataVizSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section ref={sectionRef} className="relative py-8 md:py-20 bg-[#0A0E1A]">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-violet/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="text-center mb-6 md:mb-12">
          <p className="text-xs md:text-xs font-medium text-neon-cyan tracking-widest uppercase mb-2 md:mb-2">
            Live Metrics
          </p>
          <h2 className="text-lg md:text-3xl xl:text-4xl font-display font-bold text-white">
            Real-time <span className="gradient-text">Growth Analytics</span>
          </h2>
          <p className="text-white mt-2 md:mt-3 max-w-xl mx-auto text-xs md:text-base">
            Transparent, data-driven performance across all investment categories
          </p>
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {/* Monthly Growth */}
          <ScrollMouseInteractive isInView={isInView} depth="front" maxTranslateY={35} maxTilt={15} className="h-full">
            <ChartCard title="Portfolio Growth" subtitle="Monthly USDT volume (7 months)">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyGrowthData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B5CFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7B5CFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#8A8AA0", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8A8AA0", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, "Volume"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#7B5CFF"
                    strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#7B5CFF", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </ScrollMouseInteractive>

          {/* Investment Distribution */}
          <ScrollMouseInteractive isInView={isInView} depth="middle" maxTranslateY={35} maxTilt={15} className="h-full">
            <ChartCard title="Investment Distribution" subtitle="Allocation across 5 verticals">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    formatter={(v: any) => [`${v}%`, "Allocation"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {distributionData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px] text-white truncate">{d.name}</span>
                    <span className="text-[10px] text-white ml-auto">{d.value}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </ScrollMouseInteractive>

          {/* Active Members */}
          <ScrollMouseInteractive isInView={isInView} depth="back" maxTranslateY={35} maxTilt={15} className="h-full">
            <ChartCard title="Community Growth" subtitle="Active & new members (7 months)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={membersData}>
                  <defs>
                    <linearGradient id="lineGradActive" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00E5FF" />
                      <stop offset="100%" stopColor="#7B5CFF" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#8A8AA0", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8A8AA0", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    formatter={(v: any) => [Number(v).toLocaleString(), ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#00E5FF"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#00E5FF" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="new"
                    stroke="#00FFA3"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4, fill: "#00FFA3" }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-3">
                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-neon-cyan" /><span className="text-[10px] text-white">Active</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-neon-green" /><span className="text-[10px] text-white">New</span></div>
              </div>
            </ChartCard>
          </ScrollMouseInteractive>
        </div>
      </div>
    </section>
  );
}
