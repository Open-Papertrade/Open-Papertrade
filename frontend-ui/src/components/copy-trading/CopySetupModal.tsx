"use client";

import { useState } from "react";
import { X, Loader2, Zap } from "lucide-react";
import { API_HOST } from "@/lib/api";

interface Props {
  username: string;
  displayName: string;
  onClose: () => void;
  onSuccess: () => void;
  mode: "copy" | "mirror";
}

const DELAYS = [
  { value: "NONE", label: "Instant" },
  { value: "1H", label: "1 Hour" },
  { value: "6H", label: "6 Hours" },
  { value: "24H", label: "24 Hours" },
];

export default function CopySetupModal({ username, displayName, onClose, onSuccess, mode }: Props) {
  const [allocatedFunds, setAllocatedFunds] = useState(10000);
  const [tradeDelay, setTradeDelay] = useState("NONE");
  const [proportionalSizing, setProportionalSizing] = useState(true);
  const [maxTradePercent, setMaxTradePercent] = useState(25);
  const [copySells, setCopySells] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const endpoint = mode === "mirror"
      ? `${API_HOST}/api/users/copy-trading/mirror/${username}/`
      : `${API_HOST}/api/users/copy-trading/copy/${username}/`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          allocatedFunds,
          tradeDelay,
          proportionalSizing,
          maxTradePercent,
          copySells,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[440px] bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-medium text-[var(--text-primary)]">
              {mode === "mirror" ? "Mirror Portfolio" : "Start Copy Trading"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {mode === "mirror" ? "Replicate" : "Auto-copy"} {displayName}&apos;s trades
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-dim)]">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Allocate Funds ($)</label>
            <input
              type="number"
              value={allocatedFunds}
              onChange={(e) => setAllocatedFunds(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
            <p className="text-[10px] text-[var(--text-dim)] mt-1">
              This amount is reserved from your buying power for copy trading.
            </p>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Trade Delay</label>
            <div className="flex gap-2">
              {DELAYS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setTradeDelay(d.value)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    tradeDelay === d.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      : "border-[var(--border-primary)] text-[var(--text-secondary)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "copy" && (
            <>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                  Max per trade: {maxTradePercent}%
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={maxTradePercent}
                  onChange={(e) => setMaxTradePercent(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent-primary)]"
                />
                <div className="flex justify-between text-[9px] text-[var(--text-dim)]">
                  <span>5% (safe)</span>
                  <span>50% (aggressive)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--text-primary)]">Proportional Sizing</span>
                  <p className="text-[10px] text-[var(--text-dim)]">Scale trades relative to your allocated funds</p>
                </div>
                <button
                  onClick={() => setProportionalSizing(!proportionalSizing)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    proportionalSizing ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-muted)]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${proportionalSizing ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--text-primary)]">Copy Sells</span>
                  <p className="text-[10px] text-[var(--text-dim)]">Auto-sell when the trader sells</p>
                </div>
                <button
                  onClick={() => setCopySells(!copySells)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    copySells ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-muted)]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${copySells ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="text-xs text-[var(--accent-red)] bg-[var(--accent-red)]/10 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || allocatedFunds <= 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Zap size={16} />
          )}
          {mode === "mirror"
            ? `Mirror Portfolio ($${allocatedFunds.toLocaleString()})`
            : `Start Copying ($${allocatedFunds.toLocaleString()})`}
        </button>
      </div>
    </div>
  );
}
