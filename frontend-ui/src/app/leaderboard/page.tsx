"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, Crown, Medal, TrendingUp, BarChart3, Zap, Target, Loader2, Globe, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { usePortfolio } from "@/context/PortfolioContext";
import { userAPI, type LeaderboardEntry, type UserStats, API_HOST } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

type SortOption = 'portfolio_return' | 'realized_profit' | 'total_trades' | 'win_rate' | 'xp';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'portfolio_return', label: 'Return %' },
  { value: 'realized_profit', label: 'Profit' },
  { value: 'total_trades', label: 'Trades' },
  { value: 'win_rate', label: 'Win Rate' },
  { value: 'xp', label: 'XP' },
];

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    'Retail Trader': '#6B7280',
    'Day Trader': '#3B82F6',
    'Swing Trader': '#22C55E',
    'Floor Trader': '#A855F7',
    'Fund Manager': '#F59E0B',
    'Market Maker': '#EF4444',
    'Wall Street Legend': '#FFD700',
  };
  return colors[rank] || '#6B7280';
}

function getPositionBadge(position: number) {
  if (position === 1) return <Crown size={16} className="text-yellow-400" />;
  if (position === 2) return <Medal size={16} className="text-gray-300" />;
  if (position === 3) return <Medal size={16} className="text-amber-600" />;
  return <span className="font-mono text-sm text-[var(--text-muted)]">{position}</span>;
}

export default function LeaderboardPage() {
  const { user } = usePortfolio();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalTraders, setTotalTraders] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('portfolio_return');
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  const fetchLeaderboard = useCallback(async (sort: SortOption, currentScope: 'global' | 'friends') => {
    setIsLoading(true);
    try {
      const leaderboardPromise = currentScope === 'friends'
        ? userAPI.getFriendsLeaderboard(sort, 50)
        : userAPI.getLeaderboard(sort, 50);
      const [leaderboardRes, statsRes] = await Promise.all([
        leaderboardPromise,
        userAPI.getStats(),
      ]);
      setLeaderboard(leaderboardRes.leaderboard);
      setTotalTraders(leaderboardRes.totalTraders);
      setStats(statsRes);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(sortBy, scope);
  }, [sortBy, scope, fetchLeaderboard]);

  const currentUserEntry = leaderboard.find(e => e.isCurrentUser);

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Leaderboard"
          subtitle="Compete with other traders and climb the ranks"
        />

        {/* Your Rank Card */}
        {stats && (
          <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-5">
              <Trophy size={18} className="text-[var(--accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your Rank</h2>
            </div>
            <div className="grid grid-cols-6 gap-4">
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-center">
                <span className="text-xs text-[var(--text-muted)] block mb-1">Position</span>
                <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {currentUserEntry ? `#${currentUserEntry.position}` : '--'}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-center">
                <span className="text-xs text-[var(--text-muted)] block mb-1">Level</span>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="font-mono text-2xl font-bold"
                    style={{ color: getRankColor(stats.rank.rank) }}
                  >
                    {stats.rank.level}
                  </span>
                </div>
                <span className="text-[10px] font-medium" style={{ color: getRankColor(stats.rank.rank) }}>
                  {stats.rank.rank}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-center">
                <span className="text-xs text-[var(--text-muted)] block mb-1">XP</span>
                <span className="font-mono text-2xl font-bold text-[var(--accent-primary)]">
                  {stats.rank.xp.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-center">
                <span className="text-xs text-[var(--text-muted)] block mb-1">Return</span>
                <span className={`font-mono text-2xl font-bold ${
                  (currentUserEntry?.portfolioReturn ?? 0) >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}>
                  {currentUserEntry ? `${currentUserEntry.portfolioReturn >= 0 ? '+' : ''}${currentUserEntry.portfolioReturn}%` : '--'}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-center">
                <span className="text-xs text-[var(--text-muted)] block mb-1">Win Rate</span>
                <span className="font-mono text-2xl font-bold text-[var(--accent-green)]">
                  {stats.winRate}%
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-center">
                <span className="text-xs text-[var(--text-muted)] block mb-1">Trades</span>
                <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {stats.totalTrades}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          {/* Scope Toggle */}
          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] p-1">
            <button
              onClick={() => setScope('global')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                scope === 'global'
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
              }`}
            >
              <Globe size={13} />
              Global
            </button>
            <button
              onClick={() => setScope('friends')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                scope === 'friends'
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
              }`}
            >
              <Users size={13} />
              Friends
            </button>
          </div>

          <div className="w-px h-5 bg-[var(--border-primary)]" />

          <span className="text-xs font-medium text-[var(--text-muted)]">Sort by</span>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[60px_1fr_100px_120px_120px_100px_100px] gap-4 px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card-inner)]">
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase">Rank</span>
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase">Trader</span>
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase text-center">Level</span>
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase text-right">Return %</span>
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase text-right">Profit</span>
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase text-center">Trades</span>
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-dim)] uppercase text-center">Win Rate</span>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && leaderboard.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              {scope === 'friends' ? (
                <>
                  <Users size={40} className="text-[var(--text-dim)]" />
                  <p className="text-sm text-[var(--text-muted)]">No friends on the leaderboard yet.</p>
                  <Link
                    href="/friends"
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
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

          {/* Table Rows */}
          {!isLoading && leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`grid grid-cols-[60px_1fr_100px_120px_120px_100px_100px] gap-4 px-6 py-4 border-b border-[var(--border-primary)] items-center transition-colors ${
                entry.isCurrentUser
                  ? "bg-[var(--accent-primary)]/5 border-l-2 border-l-[var(--accent-primary)]"
                  : "hover:bg-[var(--bg-muted)]"
              }`}
            >
              {/* Position */}
              <div className="flex items-center justify-center w-8 h-8">
                {getPositionBadge(entry.position)}
              </div>

              {/* Trader */}
              <Link
                href={`/trader/${entry.username}`}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl.startsWith('http') ? entry.avatarUrl : `${API_HOST}${entry.avatarUrl}`}
                    alt={entry.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-white">{entry.initials}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {entry.name}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-[10px] font-medium text-[var(--accent-primary)]">(You)</span>
                    )}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">@{entry.username}</span>
                </div>
              </Link>

              {/* Level */}
              <div className="flex items-center justify-center">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                  style={{
                    color: getRankColor(entry.rank),
                    backgroundColor: `${getRankColor(entry.rank)}15`,
                  }}
                >
                  Lv.{entry.level} {entry.rank}
                </span>
              </div>

              {/* Return % */}
              <div className="text-right">
                <span className={`font-mono text-sm font-semibold ${
                  entry.portfolioReturn >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}>
                  {entry.portfolioReturn >= 0 ? '+' : ''}{entry.portfolioReturn}%
                </span>
              </div>

              {/* Profit */}
              <div className="text-right">
                <span className={`font-mono text-sm ${
                  entry.realizedProfit >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}>
                  {entry.realizedProfit >= 0 ? '+' : ''}{formatCurrency(entry.realizedProfit)}
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
            </div>
          ))}
        </div>

        {/* Footer */}
        {!isLoading && leaderboard.length > 0 && (
          <div className="text-center">
            <span className="text-xs text-[var(--text-dim)]">
              Showing top {leaderboard.length} of {totalTraders} traders
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
