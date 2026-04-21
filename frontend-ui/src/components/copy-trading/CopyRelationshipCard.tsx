"use client";

import { Pause, Play, Square, Settings, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface RelData {
  id: string;
  leader: { username: string; name: string; avatarUrl: string | null };
  status: string;
  allocatedFunds: number;
  remainingFunds: number;
  tradeDelay: string;
  proportionalSizing: boolean;
  copySells: boolean;
  createdAt: string;
  stats?: {
    totalCopyTrades: number;
    executed: number;
    failed: number;
    pending: number;
    invested: number;
  };
}

interface Props {
  relationship: RelData;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
}

export default function CopyRelationshipCard({
  relationship: r,
  onPause,
  onResume,
  onStop,
}: Props) {
  const router = useRouter();
  const isActive = r.status === "ACTIVE";
  const isPaused = r.status === "PAUSED";
  const invested = r.stats?.invested ?? r.allocatedFunds - r.remainingFunds;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-4 hover:border-[var(--border-muted)] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`/copy-trading/${r.leader.username}`)}
        >
          <div className="w-10 h-10 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
            {r.leader.avatarUrl ? (
              <img src={r.leader.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[var(--text-muted)]">
                {r.leader.name?.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              {r.leader.name}
              <ChevronRight size={12} className="text-[var(--text-dim)]" />
            </div>
            <div className="text-xs text-[var(--text-muted)]">@{r.leader.username}</div>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
            isActive
              ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
              : isPaused
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-[var(--bg-muted)] text-[var(--text-dim)]"
          }`}
        >
          {r.status}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">Allocated</div>
          <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
            ${r.allocatedFunds.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">Remaining</div>
          <div className="text-sm font-mono font-semibold text-[var(--text-secondary)]">
            ${r.remainingFunds.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[var(--text-dim)]">Invested</div>
          <div className="text-sm font-mono font-semibold text-[var(--accent-primary)]">
            ${invested.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Trade stats */}
      {r.stats && (
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-[var(--text-muted)]">
            {r.stats.totalCopyTrades} trades
          </span>
          <span className="text-[var(--accent-green)]">
            {r.stats.executed} executed
          </span>
          {r.stats.failed > 0 && (
            <span className="text-[var(--accent-red)]">
              {r.stats.failed} failed
            </span>
          )}
          {r.stats.pending > 0 && (
            <span className="text-yellow-400">
              {r.stats.pending} pending
            </span>
          )}
        </div>
      )}

      {/* Config badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge label={`Delay: ${r.tradeDelay === "NONE" ? "Instant" : r.tradeDelay}`} />
        <Badge label={r.proportionalSizing ? "Proportional" : "Fixed size"} />
        {r.copySells && <Badge label="Copy sells" />}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-primary)]">
        {isActive && (
          <button
            onClick={() => onPause(r.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-lg bg-[var(--bg-muted)] text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            <Pause size={10} /> Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={() => onResume(r.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-lg bg-[var(--accent-green)]/10 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/20 transition-colors"
          >
            <Play size={10} /> Resume
          </button>
        )}
        <button
          onClick={() => onStop(r.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-lg bg-[var(--accent-red)]/10 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-colors"
        >
          <Square size={10} /> Stop
        </button>
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 text-[9px] font-medium rounded bg-[var(--bg-muted)] text-[var(--text-dim)]">
      {label}
    </span>
  );
}
