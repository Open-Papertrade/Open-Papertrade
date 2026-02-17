"use client";

import { ArrowUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  subtext?: string;
  valueColor?: string;
  showLiveBadge?: boolean;
  isPositive?: boolean;
}

export default function MetricCard({
  label,
  value,
  change,
  changeLabel,
  subtext,
  valueColor = "var(--text-primary)",
  showLiveBadge = false,
  isPositive = true,
}: MetricCardProps) {
  return (
    <div className="flex-1 bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.5px] text-[var(--text-muted)]">
          {label}
        </span>
        {showLiveBadge && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]"
              style={{
                boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
              }}
            />
            <span className="text-[10px] font-medium text-[var(--accent-green)]">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <span
        className="font-mono text-[32px] font-medium tracking-[-1px]"
        style={{ color: valueColor }}
      >
        {value}
      </span>

      {/* Change or Subtext */}
      {change ? (
        <div className="flex items-center gap-1.5">
          <ArrowUp
            size={14}
            className={isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}
          />
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
            }`}
          >
            {change}
            {changeLabel && ` ${changeLabel}`}
          </span>
        </div>
      ) : subtext ? (
        <span className="text-xs text-[var(--text-dim)]">{subtext}</span>
      ) : null}
    </div>
  );
}
