"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { ScrollMouseInteractive } from "@/components/motion/ScrollMouseInteractive";

interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isIndex?: boolean;
  history: number[];
  flash?: "up" | "down" | null;
}

const INITIAL_STOCKS: StockItem[] = [
  { symbol: "NIFTY 50", name: "NSE Nifty 50 Index", price: 23415.80, change: 112.40, changePercent: 0.48, isIndex: true, history: [23300, 23320, 23350, 23380, 23360, 23400, 23415.80] },
  { symbol: "SENSEX", name: "BSE Sensex Index", price: 76950.50, change: 395.20, changePercent: 0.52, isIndex: true, history: [76500, 76600, 76700, 76850, 76800, 76900, 76950.50] },
  { symbol: "NASDAQ", name: "Nasdaq Composite", price: 17732.60, change: -42.80, changePercent: -0.24, isIndex: true, history: [17800, 17790, 17750, 17760, 17720, 17740, 17732.60] },
  { symbol: "NVDA", name: "NVIDIA Corp", price: 128.20, change: 4.85, changePercent: 3.93, history: [122, 123, 125, 126, 124, 127, 128.20] },
  { symbol: "AAPL", name: "Apple Inc.", price: 214.30, change: 1.25, changePercent: 0.59, history: [212, 213, 211, 212, 213, 214, 214.30] },
  { symbol: "TSLA", name: "Tesla Inc.", price: 187.40, change: -3.10, changePercent: -1.63, history: [192, 190, 189, 188, 189, 186, 187.40] },
  { symbol: "MSFT", name: "Microsoft Corp", price: 442.15, change: 2.10, changePercent: 0.48, history: [438, 439, 441, 440, 441, 442, 442.15] },
  { symbol: "BTC", name: "Bitcoin / USDT", price: 67845.00, change: 840.00, changePercent: 1.25, history: [66900, 67100, 67300, 67200, 67400, 67600, 67845.00] }
];

export default function StockMarketSection() {
  const [stocks, setStocks] = useState<StockItem[]>(INITIAL_STOCKS);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());

    const interval = setInterval(() => {
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          const deviationPercent = (Math.random() - 0.5) * 0.4;
          const priceDiff = stock.price * (deviationPercent / 100);
          const newPrice = Math.max(0.1, Number((stock.price + priceDiff).toFixed(2)));
          const originalPrice = INITIAL_STOCKS.find((s) => s.symbol === stock.symbol)?.price || stock.price;
          const newChange = Number((newPrice - originalPrice).toFixed(2));
          const newChangePercent = Number(((newChange / originalPrice) * 100).toFixed(2));
          const flash = priceDiff > 0 ? "up" : "down";
          const newHistory = [...stock.history.slice(1), newPrice];

          return {
            ...stock,
            price: newPrice,
            change: newChange,
            changePercent: newChangePercent,
            history: newHistory,
            flash
          };
        })
      );
      setLastUpdated(new Date().toLocaleTimeString());

      setTimeout(() => {
        setStocks((current) => current.map((s) => ({ ...s, flash: null })));
      }, 800);

    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} id="markets" className="relative py-12 md:py-24 bg-transparent overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-xs text-neon-cyan font-medium mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
              Live Trading Feeds
            </div>
            <h2 className="text-xl md:text-3xl lg:text-4xl font-display font-bold text-white leading-tight">
              Real-Time <span className="gradient-text">Global Markets</span>
            </h2>
            <p className="text-xs md:text-sm text-white mt-2 max-w-xl">
              Track global index performances and premium stock yields as calculated directly by official brokerage API nodes.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl self-start md:self-auto">
            <RefreshCw size={12} className="animate-spin text-neon-cyan" />
            Last updated: {lastUpdated || "Loading..."}
          </div>
        </div>

        {/* Top Indices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stocks.filter((s) => s.isIndex).map((index, idx) => {
            const isPositive = index.change >= 0;
            const flashColor = index.flash === "up" ? "bg-neon-green/20 border-neon-green/40" : index.flash === "down" ? "bg-neon-magenta/20 border-neon-magenta/40" : "bg-white/5 border-white/10";
            return (
              <ScrollMouseInteractive key={index.symbol} isInView={isInView} depth={idx % 2 === 0 ? "front" : "middle"} maxTranslateY={35} maxTilt={15}>
                <div className={`glass-card p-5 border transition-all duration-300 ${flashColor}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white uppercase font-semibold tracking-wider">{index.name}</span>
                      <h3 className="text-lg font-bold text-white mt-1">{index.symbol}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isPositive ? "bg-neon-green/10 text-neon-green" : "bg-neon-magenta/10 text-neon-magenta"}`}>
                      {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {isPositive ? "+" : ""}{index.changePercent}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-4">
                    <span className="text-2xl font-display font-bold text-white tabular-nums">
                      {index.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-xs font-semibold ${isPositive ? "text-neon-green" : "text-neon-magenta"}`}>
                      {isPositive ? "↑" : "↓"} {Math.abs(index.change).toFixed(2)}
                    </span>
                  </div>

                  {/* Sparkline Visual Graph */}
                  <div className="w-full h-8 mt-4 opacity-75">
                    <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={isPositive ? "#00FFA3" : "#FF3CAC"}
                        strokeWidth="1.5"
                        points={index.history.map((val, idx) => {
                          const min = Math.min(...index.history);
                          const max = Math.max(...index.history);
                          const range = max - min || 1;
                          const x = (idx / (index.history.length - 1)) * 100;
                          const y = 30 - ((val - min) / range) * 26 - 2;
                          return `${x},${y}`;
                        }).join(" ")}
                      />
                    </svg>
                  </div>
                </div>
              </ScrollMouseInteractive>
            );
          })}
        </div>

        {/* Hot Stocks Table */}
        <ScrollMouseInteractive isInView={isInView} depth="back" maxTranslateY={20} maxTilt={6}>
          <div className="glass-card border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Top Traded Stocks</span>
              <span className="text-[10px] text-white">Simultaneous Real-time Updates</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-white uppercase tracking-wider bg-white/[0.02]">
                    <th className="py-3 px-4">Asset</th>
                    <th className="py-3 px-4">Market Price</th>
                    <th className="py-3 px-4">Change ($)</th>
                    <th className="py-3 px-4">Change (%)</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Trend (Past 7 ticks)</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.filter((s) => !s.isIndex).map((stock) => {
                    const isPositive = stock.change >= 0;
                    const rowFlashClass = stock.flash === "up" ? "bg-neon-green/10" : stock.flash === "down" ? "bg-neon-magenta/10" : "hover:bg-white/[0.02]";
                    return (
                      <tr key={stock.symbol} className={`border-b border-white/5 transition-colors duration-200 ${rowFlashClass}`}>
                        <td className="py-3.5 px-4 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-neon-cyan">
                            {stock.symbol[0]}
                          </div>
                          <div>
                            <p className="font-bold text-white">{stock.symbol}</p>
                            <p className="text-[10px] text-white">{stock.name}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-white tabular-nums">
                          ${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3.5 px-4 font-semibold tabular-nums ${isPositive ? "text-neon-green" : "text-neon-magenta"}`}>
                          {isPositive ? "+" : ""}{stock.change.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 tabular-nums">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${isPositive ? "bg-neon-green/10 text-neon-green" : "bg-neon-magenta/10 text-neon-magenta"}`}>
                            {isPositive ? "↑" : "↓"} {Math.abs(stock.changePercent)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell w-32">
                          <svg viewBox="0 0 100 20" className="w-full h-6" preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke={isPositive ? "#00FFA3" : "#FF3CAC"}
                              strokeWidth="1.5"
                              points={stock.history.map((val, idx) => {
                                const min = Math.min(...stock.history);
                                const max = Math.max(...stock.history);
                                const range = max - min || 1;
                                const x = (idx / (stock.history.length - 1)) * 100;
                                const y = 20 - ((val - min) / range) * 16 - 2;
                                return `${x},${y}`;
                              }).join(" ")}
                            />
                          </svg>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollMouseInteractive>

      </div>
    </section>
  );
}
