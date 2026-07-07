"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/remove-user", label: "Remove User" },
  { href: "/admin/move-user", label: "Move User" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/kyc", label: "KYC" },
  { href: "/admin/commission", label: "Commission" },
  { href: "/admin/monthly-closing", label: "Monthly Closing" },
  { href: "/admin/income-distribution", label: "Income Distribution" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/share-tree", label: "Share Tree" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/reports", label: "Reports & Analytics" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/settings", label: "Website" },
  { href: "/admin/support", label: "Support Tickets" },
  { href: "/admin/booster-wallet", label: "Booster Wallet" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/business-rules", label: "Business Rules" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/fraud", label: "Fraud Detection" },
  { href: "/admin/backup", label: "Backups" },
  { href: "/admin/pins", label: "PIN Management" },
  { href: "/admin/wallet-management", label: "Wallet Management" },
];

export default function AdminSubnav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 -mx-1 px-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
            pathname === t.href
              ? "border-neon-magenta text-neon-magenta bg-neon-magenta/10"
              : "border-white/10 text-ink-muted hover:border-white/25"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
