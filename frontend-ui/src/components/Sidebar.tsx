"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Repeat,
  History,
  Star,
  Trophy,
  Users,
  Settings,
  LogOut,
  FileBarChart,
} from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useAuth } from "@/context/AuthContext";
import { API_HOST } from "@/lib/api";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3.5 py-3 rounded-lg w-full cursor-pointer transition-colors ${
        active
          ? "bg-[var(--bg-hover)]"
          : "hover:bg-[var(--bg-hover)]"
      }`}
    >
      <span className={active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}>
        {icon}
      </span>
      <span
        className={`text-sm ${
          active
            ? "text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)]"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/" },
  { icon: <TrendingUp size={18} />, label: "Markets", href: "/markets" },
  { icon: <Wallet size={18} />, label: "Portfolio", href: "/portfolio" },
  { icon: <Repeat size={18} />, label: "Trade", href: "/trade" },
  { icon: <History size={18} />, label: "History", href: "/history" },
  { icon: <Star size={18} />, label: "Watchlist", href: "/watchlist" },
  { icon: <FileBarChart size={18} />, label: "Reports", href: "/reports" },
  { icon: <Trophy size={18} />, label: "Leaderboard", href: "/leaderboard" },
  { icon: <Users size={18} />, label: "Friends", href: "/friends" },
  { icon: <Settings size={18} />, label: "Account", href: "/account" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = usePortfolio();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="w-[260px] h-full bg-[var(--bg-sidebar)] flex flex-col py-6 px-5 border-l-[3px] border-l-[var(--accent-primary)]">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src="/logo.png" alt="Open Papertrade" width={32} height={32} className="shrink-0" />
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm tracking-[1px] text-[var(--text-primary)]">
            OPEN
          </span>
          <span className="font-mono text-sm font-bold tracking-[1px] text-[var(--accent-primary)]">
            PAPERTRADE
          </span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 mt-8 flex-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={pathname === item.href}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="h-px bg-[var(--border-muted)] my-5" />

      {/* User Account */}
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_HOST}${user.avatarUrl}`}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {user.initials}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {user.name}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] truncate">
              {user.email}
            </span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
