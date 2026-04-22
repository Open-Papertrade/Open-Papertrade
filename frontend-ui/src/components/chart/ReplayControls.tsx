"use client";

import { useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  X,
  Keyboard,
} from "lucide-react";

interface ReplayControlsProps {
  totalBars: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  onExit: () => void;
  currentTime?: string;
}

const SPEEDS = [0.5, 1, 2, 5, 10];

export default function ReplayControls({
  totalBars,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayPause,
  speed,
  onSpeedChange,
  onExit,
  currentTime,
}: ReplayControlsProps) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    const intervalMs = 1000 / speed;
    timerRef.current = window.setInterval(() => {
      onIndexChange(Math.min(currentIndex + 1, totalBars - 1));
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, currentIndex, totalBars, onIndexChange]);

  useEffect(() => {
    if (isPlaying && currentIndex >= totalBars - 1) onPlayPause();
  }, [currentIndex, totalBars, isPlaying, onPlayPause]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
      } else if (e.code === "ArrowRight") {
        onIndexChange(Math.min(currentIndex + 1, totalBars - 1));
      } else if (e.code === "ArrowLeft") {
        onIndexChange(Math.max(currentIndex - 1, 0));
      } else if (e.code === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, totalBars, onPlayPause, onIndexChange, onExit]);

  const progress = totalBars > 0 ? (currentIndex / (totalBars - 1)) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-card)] to-[var(--bg-card)] border-t border-[var(--border-primary)]">
      {/* Live badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]" />
        </span>
        <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--accent-primary)]">
          REPLAY
        </span>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-1 shrink-0">
        <TransportButton onClick={() => onIndexChange(0)} title="Jump to start">
          <Rewind size={13} />
        </TransportButton>
        <TransportButton
          onClick={() => onIndexChange(Math.max(currentIndex - 1, 0))}
          title="Previous bar (←)"
        >
          <SkipBack size={13} />
        </TransportButton>
        <button
          onClick={onPlayPause}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-black hover:brightness-110 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>
        <TransportButton
          onClick={() => onIndexChange(Math.min(currentIndex + 1, totalBars - 1))}
          title="Next bar (→)"
        >
          <SkipForward size={13} />
        </TransportButton>
        <TransportButton onClick={() => onIndexChange(totalBars - 1)} title="Jump to end">
          <FastForward size={13} />
        </TransportButton>
      </div>

      {/* Scrubber + counter */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={totalBars - 1}
          value={currentIndex}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer focus:outline-none"
          style={{
            background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${progress}%, var(--bg-muted) ${progress}%, var(--bg-muted) 100%)`,
          }}
        />
        <div className="flex items-baseline gap-1 font-mono shrink-0">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {currentIndex + 1}
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">/</span>
          <span className="text-[10px] text-[var(--text-muted)]">{totalBars}</span>
        </div>
      </div>

      {/* Current bar date */}
      {currentTime && (
        <div className="hidden md:flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-[var(--bg-muted)] border border-[var(--border-primary)]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Bar
          </span>
          <span className="font-mono text-[10px] text-[var(--text-primary)]">
            {formatBarTime(currentTime)}
          </span>
        </div>
      )}

      {/* Speed selector */}
      <div className="flex items-center gap-0.5 bg-[var(--bg-muted)] rounded-md p-0.5 border border-[var(--border-primary)] shrink-0">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
              speed === s
                ? "bg-[var(--accent-primary)] text-black shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Help + exit */}
      <div className="flex items-center gap-1 shrink-0">
        <div
          title="Space play/pause · ← → step · Esc exit"
          className="hidden lg:flex p-1.5 rounded text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-all cursor-help"
        >
          <Keyboard size={13} />
        </div>
        <button
          onClick={onExit}
          title="Exit replay (Esc)"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--accent-red)]/20 hover:text-[var(--accent-red)] transition-all"
        >
          <X size={13} />
          <span className="text-[10px] font-semibold hidden sm:inline">Exit</span>
        </button>
      </div>
    </div>
  );
}

function TransportButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}

function formatBarTime(raw: string): string {
  // Intraday bars come through as pure-digit epoch strings
  if (/^\d+$/.test(raw)) {
    const d = new Date(Number(raw) * 1000);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  // Daily bars come through as YYYY-MM-DD — shorten a bit
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }
  return raw;
}
