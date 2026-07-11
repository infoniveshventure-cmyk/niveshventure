"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  User,
  Users,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  Trophy,
  Settings,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  X,
  Unlock,
  DollarSign,
  Download,
  Send,
  FileCheck,
  FileText,
  Bell,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { signOut, auth } from "@/lib/firebase";
import toast from "react-hot-toast";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/unlock-access", label: "Unlock Access", icon: Unlock },
  { href: "/invest", label: "Nivesh", icon: DollarSign },
  { href: "/deposit", label: "Deposit Fund", icon: Download },
  { href: "/transfer", label: "P2P Transfer", icon: Send },
  { href: "/rewards", label: "Rank & Reward", icon: Trophy },
  { href: "/team", label: "My Network", icon: Users },
  { href: "/income", label: "My Earnings", icon: TrendingUp },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/booster-wallet", label: "Booster Wallet", icon: Zap },
  { href: "/statement", label: "Account Statement", icon: FileText },
  { href: "/business-plan", label: "Business Plan", icon: FileText },
  { href: "/withdrawal", label: "Withdrawal", icon: ArrowLeftRight },
  { href: "/kyc", label: "KYC Verification", icon: FileCheck },
  { href: "/notices", label: "Notice Board", icon: Bell },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch {
      // ignore Firebase sign-out errors
    }

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore logout API errors
    }

    toast.success("Logged out");
    router.push("/");
  }

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-dvh lg:h-full w-64 bg-base-soft border-r border-white/10 z-50
        transition-transform duration-300 flex flex-col ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 py-3 md:py-3.5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo1.png" alt="Nivesh Ventures" width={28} height={28} className="rounded-lg" />
            <span className="font-display font-bold tracking-wide text-sm">Nivesh Ventures</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-ink-muted">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${active
                  ? "bg-gradient-to-r from-neon-violet/25 to-neon-cyan/10 text-neon-cyan border border-neon-violet/40 shadow-neon-sm"
                  : "text-ink-muted hover:bg-white/5 hover:text-ink"
                  }`}
              >
                <Icon size={17} />
                {l.label}
              </Link>
            );
          })}
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${pathname.startsWith("/admin")
                ? "bg-gradient-to-r from-neon-magenta/25 to-neon-violet/10 text-neon-magenta border border-neon-magenta/40"
                : "text-ink-muted hover:bg-white/5 hover:text-ink"
                }`}
            >
              <ShieldCheck size={17} />
              Admin Panel
            </Link>
          )}
        </nav>

        <button
          onClick={handleLogout}
          className="mx-3 mb-5 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neon-magenta hover:bg-neon-magenta/10 transition"
        >
          <LogOut size={17} />
          Logout
        </button>
      </aside>
    </>
  );
}
