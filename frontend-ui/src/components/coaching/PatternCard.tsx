"use client";

import { AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";

interface Pattern {
  id: string;
  name: string;
  icon: string;
  severity: string;
  description: string;
  advice: string;
  occurrences: number;
  total: number;
  frequency: number;
  examples: string[];
}

interface Props {
  pattern: Pattern;
}

export default function PatternCard({ pattern }: Props) {
  const severityStyles: Record<string, { border: string; bg: string; icon: React.ReactNode }> = {
    danger: {
      border: "border-[var(--accent-red)]/30",
      bg: "bg-[var(--accent-red)]/5",
      icon: <AlertCircle size={14} className="text-[var(--accent-red)]" />,
    },
    warning: {
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/5",
      icon: <AlertTriangle size={14} className="text-yellow-500" />,
    },
    info: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/5",
      icon: <Info size={14} className="text-blue-500" />,
    },
    positive: {
      border: "border-[var(--accent-green)]/30",
      bg: "bg-[var(--accent-green)]/5",
      icon: <CheckCircle size={14} className="text-[var(--accent-green)]" />,
    },
  };

  const style = severityStyles[pattern.severity] || severityStyles.info;

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${style.border} ${style.bg}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{pattern.icon}</span>
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              {pattern.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              {style.icon}
              <span className="text-[10px] text-[var(--text-muted)] capitalize">
                {pattern.severity}
              </span>
              {pattern.frequency > 0 && (
                <span className="text-[10px] text-[var(--text-dim)]">
                  &middot; {pattern.occurrences}/{pattern.total} trades ({pattern.frequency}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {pattern.description}
      </p>

      {pattern.examples.length > 0 && (
        <div className="space-y-1">
          {pattern.examples.map((ex, i) => (
            <div
              key={i}
              className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--bg-muted)] px-2 py-1 rounded"
            >
              {ex}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-[var(--border-primary)]">
        <p className="text-[11px] text-[var(--accent-primary)] font-medium">
          {pattern.advice}
        </p>
      </div>
    </div>
  );
}
