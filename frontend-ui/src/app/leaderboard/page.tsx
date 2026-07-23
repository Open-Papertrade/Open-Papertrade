"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Trophy, Crown, Medal, Loader2, Globe, Users, ArrowUpRight, TrendingUp,
  TrendingDown, Sparkles,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { usePortfolio } from "@/context/PortfolioContext";
import { userAPI, type LeaderboardEntry, type UserStats, API_HOST } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type SortOption = 'portfolio_return' | 'realized_profit' | 'total_trades' | 'win_rate' | 'xp';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'portfolio_return', label: 'Return %' },
  { value: 'realized_profit', label: 'Profit' },
  { value: 'total_trades', label: 'Trades' },
  { value: 'win_rate', label: 'Win Rate' },
  { value: 'xp', label: 'XP' },
];

// Rank → accent colour. Used for the level pill and the podium ring.
const RANK_COLORS: Record<string, string> = {
  'Retail Trader':      '#6B7280',
  'Day Trader':         '#3B82F6',
  'Swing Trader':       '#22C55E',
  'Floor Trader':       '#A855F7',
  'Fund Manager':       '#F59E0B',
  'Market Maker':       '#EF4444',
  'Wall Street Legend': '#FFD700',
};
const rankColor = (rank: string) => RANK_COLORS[rank] || '#6B7280';

export default function LeaderboardPage() {
  const { user } = usePortfolio();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalTraders, setTotalTraders] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('portfolio_return');
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  const fetchLeaderboard = useCallback(
    async (sort: SortOption, currentScope: 'global' | 'friends') => {
      setIsLoading(true);
      try {
        const leaderboardPromise = currentScope === 'friends'
          ? userAPI.getFriendsLeaderboard(sort, 100)
          : userAPI.getLeaderboard(sort, 100);
        const [leaderboardRes, statsRes] = await Promise.all([
          leaderboardPromise,
          userAPI.getStats().catch(() => null),
        ]);
        setLeaderboard(leaderboardRes.leaderboard);
        setTotalTraders(leaderboardRes.totalTraders);
        setStats(statsRes);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLeaderboard(sortBy, scope);
  }, [sortBy, scope, fetchLeaderboard]);

  const currentUserEntry = useMemo(
    () => leaderboard.find(e => e.isCurrentUser),
    [leaderboard]
  );

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Leaderboard"
          subtitle="Compete with other traders and climb the ranks"
        />

        {/* ── Your rank card ─────────────────────────────────────────── */}
        {stats && (
          <div className="relative shrink-0 bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-primary)]">
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30 pointer-events-none blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)",
              }}
              aria-hidden
            />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 flex items-center justify-center">
                <Trophy size={14} className="text-[var(--accent-primary)]" />
              </div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Your rank
              </h2>
              {currentUserEntry && (
                <span className="ml-auto text-[11px] font-mono text-[var(--text-muted)]">
                  {currentUserEntry.position} of {totalTraders}
                </span>
              )}
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatTile
                label="Position"
                value={currentUserEntry ? `#${currentUserEntry.position}` : '--'}
                accent
              />
              <StatTile
                label="Level"
                value={`Lv.${stats.rank.level}`}
                sub={stats.rank.rank}
                color={rankColor(stats.rank.rank)}
              />
              <StatTile
                label="XP"
                value={stats.rank.xp.toLocaleString()}
                accent
              />
              <StatTile
                label="Return"
                value={
                  currentUserEntry
                    ? `${currentUserEntry.portfolioReturn >= 0 ? '+' : ''}${currentUserEntry.portfolioReturn}%`
                    : '--'
                }
                color={
                  (currentUserEntry?.portfolioReturn ?? 0) >= 0
                    ? 'var(--accent-green)'
                    : 'var(--accent-red)'
                }
              />
              <StatTile label="Win Rate" value={`${stats.winRate}%`} color="var(--accent-green)" />
              <StatTile label="Trades" value={String(stats.totalTrades)} />
            </div>
          </div>
        )}

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] p-1">
            <ScopeButton active={scope === 'global'} onClick={() => setScope('global')} icon={<Globe size={13} />}>
              Global
            </ScopeButton>
            <ScopeButton active={scope === 'friends'} onClick={() => setScope('friends')} icon={<Users size={13} />}>
              Friends
            </ScopeButton>
          </div>

          <div className="w-px h-5 bg-[var(--border-primary)]" />

          <span className="text-xs font-medium text-[var(--text-muted)]">Sort by</span>
          <div className="flex gap-1.5 flex-wrap">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? "bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-primary)]/30"
                    : "bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="ml-auto text-[11px] font-mono text-[var(--text-dim)]">
            {isLoading ? '…' : `${leaderboard.length} of ${totalTraders} traders`}
          </div>
        </div>

        {/* ── Loading ────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="shrink-0 flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────── */}
        {!isLoading && leaderboard.length === 0 && (
          <div className="shrink-0 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] flex flex-col items-center justify-center py-16 gap-3">
            {scope === 'friends' ? (
              <>
                <Users size={40} className="text-[var(--text-dim)]" />
                <p className="text-sm text-[var(--text-muted)]">No friends on the leaderboard yet.</p>
                <Link href="/friends" className="text-xs text-[var(--accent-primary)] hover:underline">
                  Find and add friends
                </Link>
              </>
            ) : (
              <>
                <Trophy size={40} className="text-[var(--text-dim)]" />
                <p className="text-sm text-[var(--text-muted)]">No traders yet. Be the first!</p>
              </>
            )}
          </div>
        )}

        {/* ── Podium ─────────────────────────────────────────────────── */}
        {!isLoading && podium.length > 0 && (
          <div className="shrink-0 grid md:grid-cols-3 gap-4">
            {/* Reorder visually so #1 sits between #2 and #3 on desktop */}
            {[podium[1], podium[0], podium[2]].map((entry, i) => {
              if (!entry) return <div key={`ph-${i}`} className="hidden md:block" />;
              const rank = entry.position;
              return (
                <PodiumCard key={entry.userId} entry={entry} sortBy={sortBy}
                            elevated={rank === 1}
                            positionOrder={rank === 1 ? 2 : rank === 2 ? 1 : 3} />
              );
            })}
          </div>
        )}

        {/* ── Rest of the table ──────────────────────────────────────── */}
        {!isLoading && rest.length > 0 && (
          <div className="shrink-0 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[64px_minmax(220px,1fr)_180px_120px_130px_100px_100px] gap-4 px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card-inner)]">
              <ColHead>Rank</ColHead>
              <ColHead>Trader</ColHead>
              <ColHead>Level</ColHead>
              <ColHead align="right">Return %</ColHead>
              <ColHead align="right">Profit</ColHead>
              <ColHead align="center">Trades</ColHead>
              <ColHead align="center">Win Rate</ColHead>
            </div>

            {rest.map((entry) => (
              <LeaderRow key={entry.userId} entry={entry} sortBy={sortBy} />
            ))}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {!isLoading && leaderboard.length > 0 && (
          <div className="shrink-0 text-center pb-6">
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              Showing all {leaderboard.length} of {totalTraders} traders
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function ScopeButton({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-primary)]/30"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ColHead({
  children, align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
  return (
    <span className={`text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase ${alignCls}`}>
      {children}
    </span>
  );
}

function StatTile({
  label, value, sub, color, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
        {label}
      </div>
      <div
        className={`font-mono text-xl font-bold ${accent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] font-medium mt-0.5" style={color ? { color } : undefined}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Podium card ──────────────────────────────────────────────────── */

function PodiumCard({
  entry, sortBy, elevated, positionOrder,
}: {
  entry: LeaderboardEntry;
  sortBy: SortOption;
  elevated?: boolean;
  positionOrder: 1 | 2 | 3;
}) {
  const rank = entry.position;
  const badge =
    rank === 1 ? <Crown size={16} className="text-yellow-400" fill="currentColor" /> :
    rank === 2 ? <Medal size={14} className="text-gray-300" fill="currentColor" /> :
                 <Medal size={14} className="text-amber-600" fill="currentColor" />;

  const ringColor =
    rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';

  const metricValue =
    sortBy === 'portfolio_return' ? `${entry.portfolioReturn >= 0 ? '+' : ''}${entry.portfolioReturn}%` :
    sortBy === 'realized_profit' ? formatCurrency(entry.realizedProfit) :
    sortBy === 'total_trades' ? `${entry.totalTrades} trades` :
    sortBy === 'win_rate' ? `${entry.winRate}% wins` :
    `${entry.xp.toLocaleString()} XP`;

  return (
    <Link
      href={`/trader/${entry.username}`}
      className={`relative block rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5 ${
        elevated
          ? "border-[var(--accent-primary)]/40 bg-[var(--bg-card)] shadow-lg shadow-[var(--accent-primary)]/10 md:mt-0"
          : "border-[var(--border-primary)] bg-[var(--bg-card)] md:mt-4"
      } ${entry.isCurrentUser ? 'ring-2 ring-[var(--accent-primary)]/40' : ''}`}
      style={{ order: positionOrder }}
    >
      {/* subtle glow */}
      {elevated && (
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${ringColor} 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative p-5 flex items-start gap-4">
        {/* Position + badge */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className="w-10 h-10 rounded-xl border flex items-center justify-center font-serif text-xl font-bold"
            style={{ borderColor: ringColor, color: ringColor, background: `${ringColor}10` }}
          >
            {rank}
          </div>
          <div className="mt-1">{badge}</div>
        </div>

        {/* Avatar + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl.startsWith('http') ? entry.avatarUrl : `${API_HOST}${entry.avatarUrl}`}
                alt={entry.name}
                className="w-10 h-10 rounded-full object-cover ring-2"
                style={{ boxShadow: `0 0 0 2px ${ringColor}30` }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center ring-2"
                style={{
                  background: `linear-gradient(135deg, ${ringColor}80, ${ringColor})`,
                  boxShadow: `0 0 0 2px ${ringColor}30`,
                }}
              >
                <span className="text-xs font-bold text-white">{entry.initials}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {entry.name}
                </span>
                {entry.isCurrentUser && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                    You
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">@{entry.username}</div>
            </div>
          </div>

          {/* Level pill */}
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold mb-3"
            style={{ color: rankColor(entry.rank), backgroundColor: `${rankColor(entry.rank)}15` }}
          >
            <Sparkles size={9} />
            Lv.{entry.level} {entry.rank}
          </div>

          {/* Primary metric */}
          <div className="mt-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
              {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            </div>
            <div
              className={`font-mono text-2xl font-bold ${
                sortBy === 'portfolio_return'
                  ? (entry.portfolioReturn >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')
                  : sortBy === 'realized_profit'
                  ? (entry.realizedProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {metricValue}
            </div>
          </div>

          {/* Secondary metrics row */}
          <div className="mt-3 pt-3 border-t border-[var(--border-primary)] grid grid-cols-3 gap-1 text-[11px]">
            <MiniMetric label="Trades" value={String(entry.totalTrades)} />
            <MiniMetric label="Win" value={`${entry.winRate}%`} color="var(--accent-green)" />
            <MiniMetric label="XP" value={entry.xp.toLocaleString()} />
          </div>
        </div>

        <ArrowUpRight size={14} className="text-[var(--text-dim)] shrink-0" />
      </div>
    </Link>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">{label}</div>
      <div
        className="font-mono font-semibold text-[var(--text-primary)]"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

/* ── Regular table row ────────────────────────────────────────────── */

function LeaderRow({ entry }: { entry: LeaderboardEntry; sortBy: SortOption }) {
  const returnPositive = entry.portfolioReturn >= 0;
  const profitPositive = entry.realizedProfit >= 0;

  return (
    <Link
      href={`/trader/${entry.username}`}
      className={`grid grid-cols-1 md:grid-cols-[64px_minmax(220px,1fr)_180px_120px_130px_100px_100px] gap-4 px-6 py-4 border-b border-[var(--border-primary)] last:border-b-0 items-center transition-colors ${
        entry.isCurrentUser
          ? "bg-[var(--accent-primary)]/[.06] border-l-2 border-l-[var(--accent-primary)]"
          : "hover:bg-[var(--bg-muted)]"
      }`}
    >
      {/* Rank */}
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] flex items-center justify-center">
          <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">
            {entry.position}
          </span>
        </div>
      </div>

      {/* Trader */}
      <div className="flex items-center gap-3 min-w-0">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl.startsWith('http') ? entry.avatarUrl : `${API_HOST}${entry.avatarUrl}`}
            alt={entry.name}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-white">{entry.initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {entry.name}
            </span>
            {entry.isCurrentUser && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shrink-0">
                You
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] truncate">@{entry.username}</div>
        </div>
      </div>

      {/* Level */}
      <div className="flex items-center">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
          style={{
            color: rankColor(entry.rank),
            backgroundColor: `${rankColor(entry.rank)}15`,
          }}
        >
          Lv.{entry.level} {entry.rank}
        </span>
      </div>

      {/* Return % */}
      <div className="text-right flex items-center justify-end gap-1">
        {returnPositive ? (
          <TrendingUp size={12} className="text-[var(--accent-green)]" />
        ) : (
          <TrendingDown size={12} className="text-[var(--accent-red)]" />
        )}
        <span
          className={`font-mono text-sm font-semibold ${
            returnPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
          }`}
        >
          {returnPositive ? '+' : ''}
          {entry.portfolioReturn}%
        </span>
      </div>

      {/* Profit */}
      <div className="text-right">
        <span
          className={`font-mono text-sm ${
            profitPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
          }`}
        >
          {profitPositive ? '+' : ''}
          {formatCurrency(entry.realizedProfit)}
        </span>
      </div>

      {/* Trades */}
      <div className="text-center">
        <span className="font-mono text-sm text-[var(--text-primary)]">{entry.totalTrades}</span>
      </div>

      {/* Win Rate */}
      <div className="text-center">
        <span className="font-mono text-sm text-[var(--text-primary)]">{entry.winRate}%</span>
      </div>
    </Link>
  );
}
