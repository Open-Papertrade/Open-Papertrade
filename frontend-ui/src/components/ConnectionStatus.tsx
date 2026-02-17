"use client";

import { RefreshCw } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatTime } from "@/lib/utils";

export default function ConnectionStatus() {
  const { isLoading, error, lastUpdated, refreshPrices } = usePortfolio();

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            error
              ? "bg-[var(--accent-red)]"
              : isLoading
              ? "bg-[var(--accent-primary)] animate-pulse"
              : "bg-[var(--accent-green)]"
          }`}
        />
        <span className="text-[11px] text-[var(--text-muted)]">
          {error
            ? "Offline"
            : isLoading
            ? "Updating..."
            : lastUpdated
            ? `Updated ${formatTime(lastUpdated)}`
            : "Live"}
        </span>
      </div>

      {/* Refresh button */}
      <button
        onClick={() => refreshPrices()}
        disabled={isLoading}
        className="p-1.5 rounded-md hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
        title="Refresh prices"
      >
        <RefreshCw
          size={14}
          className={`text-[var(--text-muted)] ${isLoading ? "animate-spin" : ""}`}
        />
      </button>
    </div>
  );
}
