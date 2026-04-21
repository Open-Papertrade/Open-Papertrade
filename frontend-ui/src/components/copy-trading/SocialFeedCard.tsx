"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface FeedItem {
  id: string;
  trader: { username: string; name: string; avatarUrl: string | null };
  tradeType: string;
  symbol: string;
  name: string;
  shares: number;
  price: number;
  total: number;
  executedAt: string;
}

interface Props {
  item: FeedItem;
  onCopyTrade?: (item: FeedItem) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SocialFeedCard({ item, onCopyTrade }: Props) {
  const isBuy = item.tradeType === "BUY";

  return (
    <div className="flex items-start gap-3 p-4 border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)] transition-colors">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[var(--bg-muted)] flex items-center justify-center shrink-0">
        {item.trader.avatarUrl ? (
          <img
            src={item.trader.avatarUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-[var(--text-muted)]">
            {item.trader.name?.slice(0, 2).toUpperCase() || "?"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {item.trader.name || item.trader.username}
          </span>
          <span className="text-xs text-[var(--text-dim)]">
            @{item.trader.username}
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">
            &middot; {timeAgo(item.executedAt)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          {isBuy ? (
            <TrendingUp size={14} className="text-[var(--accent-green)]" />
          ) : (
            <TrendingDown size={14} className="text-[var(--accent-red)]" />
          )}
          <span
            className={`text-xs font-medium ${
              isBuy ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
            }`}
          >
            {item.tradeType}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {item.shares} shares of
          </span>
          <span className="text-xs font-mono font-semibold text-[var(--accent-primary)]">
            {item.symbol}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            @ ${item.price.toFixed(2)}
          </span>
        </div>

        <div className="text-[10px] text-[var(--text-dim)] mt-0.5">
          {item.name} &middot; Total: ${item.total.toLocaleString()}
        </div>
      </div>

      {/* Quick copy */}
      {onCopyTrade && (
        <button
          onClick={() => onCopyTrade(item)}
          className="px-3 py-1.5 text-[10px] font-medium rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors shrink-0"
        >
          Copy
        </button>
      )}
    </div>
  );
}
