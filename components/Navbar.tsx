"use client";

import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Left: hamburger + logo+name on mobile */}
      <div className="flex items-center gap-3 lg:gap-0">
        <button onClick={onMenuClick} className="lg:hidden text-ink-muted">
          <Menu size={22} />
        </button>

        {/* Logo + brand name — only visible on mobile (hidden on lg where sidebar shows) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Image src="/logo.png" alt="Nivesh Ventures" width={32} height={32} className="rounded-lg object-contain" />
          <span className="font-display font-bold text-sm tracking-wide text-ink">NIVESH VENTURES</span>
        </div>
      </div>

      {/* Center: welcome text on desktop */}
      <div className="hidden lg:block text-sm text-ink-muted">
        {profile ? `Welcome back, ${profile.fullName?.split(" ")[0]}` : ""}
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-4">
        <button className="relative text-ink-muted hover:text-neon-cyan transition">
          <Bell size={10} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-xs font-bold text-base">
            {profile?.fullName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight">{profile?.fullName || "Member"}</p>
            <p className="text-xs text-ink-muted leading-tight">ID: {profile?.memberId || "—"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
