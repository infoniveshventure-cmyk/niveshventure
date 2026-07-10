"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) router.push("/login");
  }, [loading, firebaseUser, router]);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    /*
     * Outer shell: full viewport, no overflow.
     * Sidebar + right-column sit side-by-side; nothing here scrolls.
     */
    <div className="flex h-dvh overflow-hidden">
      {/* ── Sidebar (fixed chrome) ── */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/*
       * Right column: fills remaining width.
       * flex-col so navbar pins to top and main takes the rest.
       */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ── Navbar (fixed chrome) ── */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/*
         * ONLY THIS <main> SCROLLS.
         * overflow-y-auto gives it an independent scroll context.
         * pb-24 accounts for MobileBottomNav on small screens.
         */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden" data-lenis-prevent>
          <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav (fixed chrome) ── */}
      <MobileBottomNav />
    </div>
  );
}
