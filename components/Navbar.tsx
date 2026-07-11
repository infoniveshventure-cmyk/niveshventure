"use client";

import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuth();
  const { data: notifData } = useSWR("/api/notifications?limit=1", fetcher, {
    refreshInterval: 10000, // Poll every 10 seconds
  });

  const unreadCount = notifData?.unread || 0;

  return (
    <header className="sticky top-0 z-30 bg-white/[0.06] backdrop-blur-xl border-b border-white/15 px-4 lg:px-8 py-2 md:py-2.5 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)]">
      {/* Left: hamburger + logo+name on mobile */}
      <div className="flex items-center gap-3 lg:gap-0">
        <button onClick={onMenuClick} className="lg:hidden text-ink-muted">
          <Menu size={22} />
        </button>
 
        {/* Logo + brand name — only visible on mobile (hidden on lg where sidebar shows) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Image src="/logo1.png" alt="Nivesh Ventures" width={28} height={28} className="rounded-lg object-contain" />
          <span className="font-display font-bold text-xs tracking-wide text-ink">NIVESH VENTURES</span>
        </div>
      </div>
 
      {/* Center: welcome text on desktop */}
      <div className="hidden lg:block text-sm text-ink-muted">
        {profile ? `Welcome back, ${profile.fullName?.split(" ")[0]}` : ""}
      </div>
 
      {/* Right: bell + avatar */}
      <div className="flex items-center gap-4">
        <Link href="/notifications" className="relative text-ink-muted hover:text-neon-cyan transition block">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-neon-magenta text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-base animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <Link href="/profile" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-xs font-bold text-base group-hover:shadow-neon-sm transition">
            {profile?.fullName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight group-hover:text-neon-cyan transition">{profile?.fullName || "Member"}</p>
            <p className="text-xs text-ink-muted leading-tight">ID: {profile?.memberId || "—"}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
