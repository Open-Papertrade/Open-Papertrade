"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Users2,
  Rss,
  Copy,
  BarChart3,
  UserPlus,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import SocialFeedCard from "@/components/copy-trading/SocialFeedCard";
import CopyRelationshipCard from "@/components/copy-trading/CopyRelationshipCard";
import { API_HOST } from "@/lib/api";

type Tab = "feed" | "copying" | "followers";

export default function CopyTradingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("feed");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/users/copy-trading/`, { credentials: "include" });
      if (res.ok) setDashboard(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/users/copy-trading/feed/`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setFeed(d.feed || []);
      }
    } catch {}
    setFeedLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    loadFeed();
  }, [loadDashboard, loadFeed]);

  const handlePause = async (id: string) => {
    await fetch(`${API_HOST}/api/users/copy-trading/copy/${id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ status: "PAUSED" }),
    });
    loadDashboard();
  };

  const handleResume = async (id: string) => {
    await fetch(`${API_HOST}/api/users/copy-trading/copy/${id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ status: "ACTIVE" }),
    });
    loadDashboard();
  };

  const handleStop = async (id: string) => {
    await fetch(`${API_HOST}/api/users/copy-trading/stop/${id}/`, {
      method: "DELETE", credentials: "include",
    });
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
        </main>
      </div>
    );
  }

  const relationships = dashboard?.relationships || [];
  const following = dashboard?.following || [];
  const followerCount = dashboard?.followerCount || 0;
  const copierCount = dashboard?.copierCount || 0;

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Copy Trading"
          subtitle="Follow top traders and automatically mirror their trades"
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Following" value={String(following.length)} />
          <StatCard label="Active Copies" value={String(relationships.filter((r: any) => r.status === "ACTIVE").length)} />
          <StatCard label="Your Followers" value={String(followerCount)} />
          <StatCard label="Copying You" value={String(copierCount)} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] w-fit">
          {([
            { key: "feed", label: "Social Feed", icon: <Rss size={12} /> },
            { key: "copying", label: `Copying (${relationships.length})`, icon: <Copy size={12} /> },
            { key: "followers", label: "Followers", icon: <Users2 size={12} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                tab === t.key
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Feed Tab */}
        {tab === "feed" && (
          <div className="space-y-4">
            {following.length === 0 ? (
              <EmptyState
                icon={<UserPlus size={40} />}
                title="Follow traders to see their activity"
                subtitle="Visit the leaderboard or a trader's profile to follow them."
                action={() => router.push("/leaderboard")}
                actionText="Browse Leaderboard"
              />
            ) : feed.length === 0 ? (
              <EmptyState
                icon={<Rss size={40} />}
                title="No activity yet"
                subtitle="Trades from traders you follow will appear here (respecting the delay you configured)."
              />
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                {feed.map((item: any) => (
                  <SocialFeedCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Copying Tab */}
        {tab === "copying" && (
          <div className="space-y-4">
            {relationships.length === 0 ? (
              <EmptyState
                icon={<Copy size={40} />}
                title="Not copying anyone yet"
                subtitle="Find a top trader and click 'Copy' to automatically mirror their trades."
                action={() => router.push("/leaderboard")}
                actionText="Find Traders"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {relationships.map((r: any) => (
                  <CopyRelationshipCard
                    key={r.id}
                    relationship={r}
                    onPause={handlePause}
                    onResume={handleResume}
                    onStop={handleStop}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Followers Tab */}
        {tab === "followers" && (
          <div className="space-y-4">
            {followerCount === 0 ? (
              <EmptyState
                icon={<Users2 size={40} />}
                title="No followers yet"
                subtitle="Trade consistently and climb the leaderboard to attract followers."
              />
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{followerCount}</span> trader(s) following your activity
                  {copierCount > 0 && (
                    <>, <span className="font-mono font-semibold text-[var(--accent-primary)]">{copierCount}</span> actively copying your trades</>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
      <span className="text-[10px] font-medium text-[var(--text-muted)] tracking-wide">{label}</span>
      <div className="font-mono text-xl font-semibold text-[var(--text-primary)] mt-1">{value}</div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
  actionText,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: () => void;
  actionText?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
      <div className="text-[var(--text-dim)]">{icon}</div>
      <p className="text-sm text-[var(--text-muted)]">{title}</p>
      <p className="text-xs text-[var(--text-dim)] max-w-md text-center">{subtitle}</p>
      {action && actionText && (
        <button
          onClick={action}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
