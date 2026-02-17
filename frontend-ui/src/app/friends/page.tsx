"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  X,
  Clock,
  Loader2,
  TrendingUp,
  BarChart3,
  Target,
  Send,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { userAPI, API_HOST, type FriendInfo } from "@/lib/api";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/utils";

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

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendInfo[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Transfer modal state
  const [transferTarget, setTransferTarget] = useState<FriendInfo | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const { buyingPower, refreshUserData } = usePortfolio();

  const fetchFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await userAPI.getFriends();
      setFriends(data.friends);
      setPendingIncoming(data.pendingIncoming);
      setPendingOutgoing(data.pendingOutgoing);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await userAPI.respondFriendRequest(friendshipId, "accept");
      await fetchFriends();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await userAPI.respondFriendRequest(friendshipId, "reject");
      setPendingIncoming((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleCancel = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await userAPI.removeFriend(friendshipId);
      setPendingOutgoing((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await userAPI.removeFriend(friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleTransfer = async () => {
    if (!transferTarget) return;
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      setTransferError("Please enter a valid amount");
      return;
    }
    setTransferLoading(true);
    setTransferError(null);
    try {
      const result = await userAPI.transferFunds(transferTarget.username, amount);
      const t = result.transfer;
      const senderSym = CURRENCY_SYMBOLS[t.senderCurrency] || t.senderCurrency;
      const recipientSym = CURRENCY_SYMBOLS[t.recipientCurrency] || t.recipientCurrency;
      setTransferSuccess(`Sent ${senderSym}${t.senderDisplayAmount.toFixed(2)} → ${transferTarget.name} received ${recipientSym}${t.recipientDisplayAmount.toFixed(2)}`);
      setTransferAmount("");
      refreshUserData();
      setTimeout(() => {
        setTransferTarget(null);
        setTransferSuccess(null);
      }, 2000);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  const renderAvatar = (item: FriendInfo) =>
    item.avatarUrl ? (
      <img
        src={item.avatarUrl.startsWith("http") ? item.avatarUrl : `${API_HOST}${item.avatarUrl}`}
        alt={item.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
        <span className="text-xs font-semibold text-white">{item.initials}</span>
      </div>
    );

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Friends"
          subtitle="Manage your friends and compete together"
        />

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Pending Incoming */}
            {pendingIncoming.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-primary)]">
                  <UserPlus size={16} className="text-[var(--accent-green)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Friend Requests
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--accent-green)]/10 text-[10px] font-bold text-[var(--accent-green)]">
                    {pendingIncoming.length}
                  </span>
                </div>
                {pendingIncoming.map((item) => (
                  <div
                    key={item.friendshipId}
                    className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-primary)] last:border-b-0"
                  >
                    {renderAvatar(item)}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/trader/${item.username}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[11px] text-[var(--text-muted)]">@{item.username}</p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{
                        color: getRankColor(item.rank),
                        backgroundColor: `${getRankColor(item.rank)}15`,
                      }}
                    >
                      Lv.{item.level} {item.rank}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(item.friendshipId)}
                        disabled={actionLoading === item.friendshipId}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-green)] text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <UserCheck size={14} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(item.friendshipId)}
                        disabled={actionLoading === item.friendshipId}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-[var(--text-muted)] text-xs hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Outgoing */}
            {pendingOutgoing.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-primary)]">
                  <Clock size={16} className="text-[var(--text-muted)]" />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Sent Requests
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-card-inner)] text-[10px] font-bold text-[var(--text-muted)]">
                    {pendingOutgoing.length}
                  </span>
                </div>
                {pendingOutgoing.map((item) => (
                  <div
                    key={item.friendshipId}
                    className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-primary)] last:border-b-0"
                  >
                    {renderAvatar(item)}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/trader/${item.username}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[11px] text-[var(--text-muted)]">@{item.username}</p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{
                        color: getRankColor(item.rank),
                        backgroundColor: `${getRankColor(item.rank)}15`,
                      }}
                    >
                      Lv.{item.level} {item.rank}
                    </span>
                    <button
                      onClick={() => handleCancel(item.friendshipId)}
                      disabled={actionLoading === item.friendshipId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-[var(--text-muted)] text-xs hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Friends List */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-primary)]">
                <Users size={16} className="text-[var(--accent-primary)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Friends
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[10px] font-bold text-[var(--accent-primary)]">
                  {friends.length}
                </span>
              </div>

              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Users size={40} className="text-[var(--text-dim)]" />
                  <p className="text-sm text-[var(--text-muted)]">No friends yet.</p>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    Visit the leaderboard to find traders!
                  </Link>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.friendshipId}
                    className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-primary)] last:border-b-0 hover:bg-[var(--bg-muted)] transition-colors"
                  >
                    {renderAvatar(friend)}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/trader/${friend.username}`}
                        className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                      >
                        {friend.name}
                      </Link>
                      <p className="text-[11px] text-[var(--text-muted)]">@{friend.username}</p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{
                        color: getRankColor(friend.rank),
                        backgroundColor: `${getRankColor(friend.rank)}15`,
                      }}
                    >
                      Lv.{friend.level} {friend.rank}
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5" title="Portfolio Return">
                        <TrendingUp size={13} className="text-[var(--text-dim)]" />
                        <span className={`font-mono text-xs font-medium ${
                          (friend.portfolioReturn ?? 0) >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                        }`}>
                          {(friend.portfolioReturn ?? 0) >= 0 ? "+" : ""}{friend.portfolioReturn ?? 0}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Total Trades">
                        <BarChart3 size={13} className="text-[var(--text-dim)]" />
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {friend.totalTrades ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Win Rate">
                        <Target size={13} className="text-[var(--text-dim)]" />
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {friend.winRate ?? 0}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTransferTarget(friend);
                        setTransferAmount("");
                        setTransferError(null);
                        setTransferSuccess(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-xs font-medium hover:bg-[var(--accent-primary)]/20 transition-colors"
                    >
                      <Send size={13} />
                      Send Funds
                    </button>

                    <button
                      onClick={() => handleRemove(friend.friendshipId)}
                      disabled={actionLoading === friend.friendshipId}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)] text-[var(--text-muted)] text-xs hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Transfer Modal */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => !transferLoading && setTransferTarget(null)} />
          <div className="relative bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Send Funds</h3>
              <button
                onClick={() => !transferLoading && setTransferTarget(null)}
                className="p-1 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {transferSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent-green)]/10 flex items-center justify-center">
                    <Send size={20} className="text-[var(--accent-green)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--accent-green)]">{transferSuccess}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-muted)]">
                    Send funds to <span className="font-medium text-[var(--text-primary)]">{transferTarget.name}</span> (@{transferTarget.username})
                  </p>

                  <div className="p-3 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                    <span className="text-xs text-[var(--text-muted)]">Your Balance</span>
                    <div className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(buyingPower, false, { convertFromUSD: false })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Amount</label>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => { setTransferAmount(e.target.value); setTransferError(null); }}
                      placeholder="0.00"
                      autoFocus
                      className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  {transferError && (
                    <div className="px-3 py-2 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)]">
                      {transferError}
                    </div>
                  )}

                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading || !transferAmount}
                    className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                  >
                    {transferLoading ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : (
                      "Send Funds"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
