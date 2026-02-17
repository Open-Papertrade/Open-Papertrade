"use client";

import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface TransactionItemProps {
  title: string;
  time: string;
  amount: string;
  badgeText: string;
  isBuy: boolean;
}

export default function TransactionItem({
  title,
  time,
  amount,
  badgeText,
  isBuy,
}: TransactionItemProps) {
  return (
    <div className="flex items-center gap-3.5 bg-[var(--bg-card-inner)] rounded-[10px] p-4 border border-[var(--border-primary)]">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
        {isBuy ? (
          <ArrowUpRight size={18} className="text-[var(--accent-green)]" />
        ) : (
          <ArrowDownLeft size={18} className="text-[var(--accent-red)]" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{time}</span>
      </div>

      {/* Amount and Badge */}
      <div className="flex flex-col items-end gap-1">
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: isBuy
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(255, 92, 0, 0.1)",
            color: isBuy ? "var(--accent-green)" : "var(--accent-primary)",
          }}
        >
          {badgeText}
        </span>
        <span
          className={`font-mono text-sm font-medium ${
            isBuy ? "text-[var(--accent-green)]" : "text-[#ADADB0]"
          }`}
        >
          {amount}
        </span>
      </div>
    </div>
  );
}
