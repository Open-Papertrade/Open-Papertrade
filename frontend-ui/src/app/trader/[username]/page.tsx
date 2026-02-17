"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  BarChart3,
  Target,
  DollarSign,
  Calendar,
  Loader2,
  Award,
  Rocket,
  Flame,
  Briefcase,
  Shield,
  Gem,
  Sunrise,
  Layers,
  Activity,
  Crown,
  UserPlus,
  UserCheck,
  Clock,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { userAPI, API_HOST, type PublicProfile, type Achievement, type FriendshipStatus } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    "Retail Trader": "#6B7280",
    "Day Trader": "#3B82F6",
    "Swing Trader": "#22C55E",
    "Floor Trader": "#A855F7",
    "Fund Manager": "#F59E0B",
    "Market Maker": "#EF4444",
    "Wall Street Legend": "#FFD700",
  };
  return colors[rank] || "#6B7280";
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const [data, status] = await Promise.all([
        userAPI.getPublicProfile(username),
        userAPI.getFriendshipStatus(username).catch(() => null),
      ]);
      setProfile(data);
      if (status) setFriendStatus(status);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSendRequest = async () => {
    setFriendLoading(true);
    try {
      const res = await userAPI.sendFriendRequest(username);
      if (res.status === 'accepted') {
        setFriendStatus({ status: 'accepted', friendshipId: res.friendshipId });
      } else {
        setFriendStatus({ status: 'pending', direction: 'outgoing', friendshipId: res.friendshipId });
      }
    } catch { /* ignore */ }
    setFriendLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!friendStatus || friendStatus.status !== 'pending') return;
    setFriendLoading(true);
    try {
      await userAPI.respondFriendRequest(friendStatus.friendshipId, 'accept');
      setFriendStatus({ status: 'accepted', friendshipId: friendStatus.friendshipId });
    } catch { /* ignore */ }
    setFriendLoading(false);
  };

  const handleRejectRequest = async () => {
    if (!friendStatus || friendStatus.status !== 'pending') return;
    setFriendLoading(true);
    try {
      await userAPI.respondFriendRequest(friendStatus.friendshipId, 'reject');
      setFriendStatus({ status: 'none' });
    } catch { /* ignore */ }
    setFriendLoading(false);
  };

  const handleCancelOrRemove = async () => {
    if (!friendStatus || !('friendshipId' in friendStatus)) return;
    setFriendLoading(true);
    try {
      await userAPI.removeFriend(friendStatus.friendshipId);
      setFriendStatus({ status: 'none' });
    } catch { /* ignore */ }
    setFriendLoading(false);
  };

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
        </main>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center">
            <Target size={28} className="text-[var(--text-dim)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Trader not found
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            No trader with username @{username} exists.
          </p>
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={16} />
            Back to Leaderboard
          </Link>
        </main>
      </div>
    );
  }

  const badgeConfig: Record<
    string,
    { icon: React.ReactNode; from: string; to: string; accent: string }
  > = {
    first_trade: { icon: <Rocket size={18} />, from: "#FF5C00", to: "#FF8C00", accent: "#FF5C00" },
    trader_10: { icon: <Flame size={18} />, from: "#22C55E", to: "#4ADE80", accent: "#22C55E" },
    trader_50: { icon: <Briefcase size={18} />, from: "#3B82F6", to: "#60A5FA", accent: "#3B82F6" },
    trader_100: { icon: <Shield size={18} />, from: "#A855F7", to: "#C084FC", accent: "#A855F7" },
    profit_1000: { icon: <Gem size={18} />, from: "#06B6D4", to: "#22D3EE", accent: "#06B6D4" },
    profit_10000: { icon: <Sunrise size={18} />, from: "#F59E0B", to: "#FBBF24", accent: "#F59E0B" },
    diversified_5: { icon: <Layers size={18} />, from: "#EC4899", to: "#F472B6", accent: "#EC4899" },
    diversified_10: { icon: <TrendingUp size={18} />, from: "#10B981", to: "#34D399", accent: "#10B981" },
    watchlist_10: { icon: <Activity size={18} />, from: "#6366F1", to: "#818CF8", accent: "#6366F1" },
    early_adopter: { icon: <Crown size={18} />, from: "#FF5C00", to: "#FFD700", accent: "#FFD700" },
  };

  const fallbackColors = [
    { from: "#FF5C00", to: "#FF8C00", accent: "#FF5C00" },
    { from: "#22C55E", to: "#4ADE80", accent: "#22C55E" },
    { from: "#3B82F6", to: "#60A5FA", accent: "#3B82F6" },
    { from: "#A855F7", to: "#C084FC", accent: "#A855F7" },
    { from: "#06B6D4", to: "#22D3EE", accent: "#06B6D4" },
  ];

  const unlockedAchievements = profile.achievements.filter((a) => a.unlocked);
  const lockedAchievements = profile.achievements.filter((a) => !a.unlocked);

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        {/* Back link */}
        <Link
          href="/leaderboard"
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Leaderboard
        </Link>

        {/* Profile Header */}
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-primary)]">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {profile.avatarUrl ? (
              <img
                src={
                  profile.avatarUrl.startsWith("http")
                    ? profile.avatarUrl
                    : `${API_HOST}${profile.avatarUrl}`
                }
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {profile.initials}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {profile.name}
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                @{profile.username}
              </p>

              <div className="flex items-center gap-3 mt-3">
                <span
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold"
                  style={{
                    color: getRankColor(profile.rank),
                    backgroundColor: `${getRankColor(profile.rank)}15`,
                  }}
                >
                  Lv.{profile.level} {profile.rank}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--accent-primary)]/10 text-[11px] font-semibold text-[var(--accent-primary)]">
                  {profile.xp.toLocaleString()} XP
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Calendar size={12} />
                  Member since {formatMemberSince(profile.memberSince)}
                </span>
              </div>
            </div>

            {/* Friend Button */}
            {friendStatus && friendStatus.status !== 'self' && (
              <div className="ml-auto flex items-center gap-2">
                {friendStatus.status === 'none' && (
                  <button
                    onClick={handleSendRequest}
                    disabled={friendLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                    Add Friend
                  </button>
                )}
                {friendStatus.status === 'pending' && friendStatus.direction === 'outgoing' && (
                  <button
                    onClick={handleCancelOrRemove}
                    disabled={friendLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-[var(--text-muted)] text-sm font-medium hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-50"
                  >
                    <Clock size={16} />
                    Request Sent
                  </button>
                )}
                {friendStatus.status === 'pending' && friendStatus.direction === 'incoming' && (
                  <>
                    <button
                      onClick={handleAcceptRequest}
                      disabled={friendLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-green)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <UserCheck size={16} />
                      Accept Request
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      disabled={friendLoading}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-[var(--text-muted)] text-sm hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                {friendStatus.status === 'accepted' && (
                  <button
                    onClick={handleCancelOrRemove}
                    disabled={friendLoading}
                    className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-[var(--text-muted)] text-sm font-medium hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-50"
                  >
                    <UserCheck size={16} />
                    <span className="group-hover:hidden">Friends</span>
                    <span className="hidden group-hover:inline">Remove</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[var(--accent-primary)]" />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Portfolio Return
              </span>
            </div>
            <span
              className={`font-mono text-2xl font-bold ${
                profile.portfolioReturn >= 0
                  ? "text-[var(--accent-green)]"
                  : "text-[var(--accent-red)]"
              }`}
            >
              {profile.portfolioReturn >= 0 ? "+" : ""}
              {profile.portfolioReturn}%
            </span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-green)]/10 flex items-center justify-center">
                <Target size={16} className="text-[var(--accent-green)]" />
              </div>
              <span className="text-xs text-[var(--text-muted)]">Win Rate</span>
            </div>
            <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
              {profile.winRate}%
            </span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 size={16} className="text-blue-500" />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Total Trades
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
              {profile.totalTrades}
            </span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign size={16} className="text-purple-500" />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Realized Profit
              </span>
            </div>
            <span
              className={`font-mono text-2xl font-bold ${
                profile.realizedProfit >= 0
                  ? "text-[var(--accent-green)]"
                  : "text-[var(--accent-red)]"
              }`}
            >
              {profile.realizedProfit >= 0 ? "+" : ""}
              {formatCurrency(profile.realizedProfit)}
            </span>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={18} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Achievements
            </h2>
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              {unlockedAchievements.length}/{profile.achievements.length}{" "}
              unlocked
            </span>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {[...unlockedAchievements, ...lockedAchievements].map(
              (achievement, idx) => {
                const config = badgeConfig[achievement.id];
                const fb = fallbackColors[idx % fallbackColors.length];
                const from = config?.from ?? fb.from;
                const to = config?.to ?? fb.to;
                const accent = config?.accent ?? fb.accent;
                const icon = config?.icon ?? <Award size={18} />;
                const hexClip =
                  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

                return (
                  <div
                    key={achievement.id}
                    title={achievement.description}
                    className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all cursor-help ${
                      achievement.unlocked
                        ? "bg-[#111115] border-[#2A2A2E]"
                        : "bg-[#111115] border-[#1F1F23] opacity-30 grayscale"
                    }`}
                  >
                    <div className="relative w-[60px] h-[60px]">
                      <div
                        className="absolute inset-0"
                        style={{
                          clipPath: hexClip,
                          background: `linear-gradient(180deg, ${from}, ${to})`,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-[35px] h-[35px] rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#0D0D0F" }}
                        >
                          <div style={{ color: accent }}>{icon}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-center">
                      <span className="text-[10px] font-bold tracking-[1px] text-[var(--text-primary)] uppercase leading-tight">
                        {achievement.name}
                      </span>
                      <span className="font-mono text-[9px] text-[#6B6B6B] leading-snug max-w-[120px]">
                        {achievement.description}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
