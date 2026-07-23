"use client";

import { useEffect, useState } from "react";
import {
  X, Copy, Sparkles, ArrowRight, Loader2, AlertTriangle, TrendingUp,
  Clock, Percent, Shuffle, Check,
} from "lucide-react";
import { userAPI, type PublicProfile } from "@/lib/api";
import { usePortfolio } from "@/context/PortfolioContext";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  trader: PublicProfile;
  onSuccess: () => void;
}

const DELAY_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "NONE", label: "Instant",   hint: "Fire the moment the leader trades" },
  { value: "1H",   label: "1 hour",    hint: "Give yourself a buffer" },
  { value: "6H",   label: "6 hours",   hint: "Half-day delay" },
  { value: "24H",  label: "24 hours",  hint: "Full day for review" },
];

const PRESETS = [1000, 5000, 10000, 25000];

export default function CopyTradesModal({ open, onClose, trader, onSuccess }: Props) {
  const { user } = usePortfolio();
  const toast = useToast();

  const buyingPower = Number(user?.buyingPower ?? 0);
  const defaultAllocation = Math.min(5000, Math.floor(buyingPower * 0.1) || 5000);
  // Store as string so the user can freely clear the field and type a new number.
  // Numeric value is derived below.
  const [allocatedText, setAllocatedText] = useState<string>(String(defaultAllocation));
  const allocated = Number(allocatedText.replace(/,/g, "")) || 0;
  const setAllocated = (n: number) => setAllocatedText(String(n));

  const [delay, setDelay] = useState("NONE");
  const [proportional, setProportional] = useState(true);
  const [maxPct, setMaxPct] = useState(25);
  const [copySells, setCopySells] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const invalid = allocated <= 0 || allocated > buyingPower;
  const remainingAfter = Math.max(0, buyingPower - allocated);
  const pctOfBuyingPower = buyingPower > 0 ? (allocated / buyingPower) * 100 : 0;

  const submit = async () => {
    if (invalid || submitting) return;
    setSubmitting(true);
    try {
      await userAPI.startCopyTrading(trader.username, {
        allocatedFunds: allocated,
        tradeDelay: delay,
        proportionalSizing: proportional,
        maxTradePercent: maxPct,
        copySells,
      });
      toast.success(
        `Now copying @${trader.username}`,
        `${formatCurrency(allocated)} allocated · trade delay ${delay === "NONE" ? "instant" : delay.toLowerCase()}`,
      );
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error("Couldn't start copy trading", e?.message || "Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-title"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: "op-toast-in-fade 200ms ease-out" }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] overflow-hidden"
        style={{ animation: "op-modal-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* Glow accent */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(255, 92, 0, 0.35) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        <div className="relative p-6">
          {/* Header */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[10px] font-mono uppercase tracking-wider text-[var(--accent-primary)] mb-3">
            <Sparkles size={10} />
            Copy Trading
          </div>
          <h2 id="copy-title" className="font-serif text-2xl tracking-[-0.02em] text-[var(--text-primary)]">
            Mirror <span className="text-[var(--accent-primary)]">@{trader.username}</span>
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Every trade they make fires an automatic mirror in your account.
            You can pause or adjust anytime.
          </p>

          {/* Leader stats snapshot */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <StatMini label="Return" value={`${trader.portfolioReturn >= 0 ? "+" : ""}${trader.portfolioReturn}%`}
                      accent={trader.portfolioReturn >= 0 ? "green" : "red"} />
            <StatMini label="Win rate" value={`${trader.winRate}%`} />
            <StatMini label="Trades" value={String(trader.totalTrades)} />
          </div>

          <div className="my-6 h-px bg-[var(--border-primary)]" />

          {/* Allocation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Allocated funds
              </label>
              <span className="text-[11px] font-mono text-[var(--text-dim)]">
                Available: {formatCurrency(buyingPower)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[var(--text-muted)] text-sm">$</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={allocatedText}
                onChange={(e) => {
                  // Only accept digits — allow empty, disallow leading zeros unless the whole value is "0"
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const cleaned = raw.length > 1 ? raw.replace(/^0+/, "") : raw;
                  setAllocatedText(cleaned);
                }}
                onBlur={() => {
                  // If left empty, snap back to "0" on blur so downstream math stays safe.
                  if (allocatedText === "") setAllocatedText("0");
                }}
                placeholder="0"
                className={`w-full bg-[var(--bg-card-inner)] border rounded-lg pl-7 pr-3 py-2.5 font-mono text-lg font-semibold text-[var(--text-primary)] focus:outline-none transition-colors ${
                  allocated > buyingPower
                    ? "border-[var(--accent-red)]"
                    : "border-[var(--border-muted)] focus:border-[var(--accent-primary)]"
                }`}
              />
            </div>
            {/* Preset chips */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAllocated(Math.min(p, buyingPower))}
                  disabled={p > buyingPower}
                  className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                    allocated === p
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      : "border-[var(--border-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-dim)] disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>
            {buyingPower > 0 && (
              <div className="mt-2 h-1 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all"
                  style={{ width: `${Math.min(100, pctOfBuyingPower)}%` }}
                />
              </div>
            )}
            <div className="mt-1.5 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>{pctOfBuyingPower.toFixed(1)}% of your buying power</span>
              <span>Remaining: {formatCurrency(remainingAfter)}</span>
            </div>
          </div>

          {/* Trade delay */}
          <div className="mt-6">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
              <Clock size={11} className="inline mr-1 -translate-y-0.5" />
              Trade delay
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {DELAY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setDelay(o.value)}
                  title={o.hint}
                  className={`px-2 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    delay === o.value
                      ? "bg-[var(--accent-primary)] text-white shadow-sm shadow-[var(--accent-primary)]/30"
                      : "bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-dim)]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced toggles */}
          <div className="mt-6 space-y-3">
            <ToggleRow
              icon={<Shuffle size={14} className="text-[var(--accent-primary)]" />}
              title="Proportional sizing"
              description="Match the leader's portfolio-% per trade"
              checked={proportional}
              onChange={setProportional}
            />
            <ToggleRow
              icon={<TrendingUp size={14} className="text-[var(--accent-primary)]" />}
              title="Copy sells"
              description="Also mirror when the leader exits positions"
              checked={copySells}
              onChange={setCopySells}
            />
          </div>

          {/* Max trade % slider */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Percent size={11} />
                Max per-trade cap
              </label>
              <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {maxPct}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={maxPct}
              onChange={(e) => setMaxPct(Number(e.target.value))}
              className="w-full accent-[var(--accent-primary)]"
            />
            <div className="mt-1 text-[11px] text-[var(--text-muted)]">
              No single mirror can use more than {formatCurrency(allocated * maxPct / 100)} of your allocation.
            </div>
          </div>

          {/* Warning if invalid */}
          {invalid && allocated > buyingPower && (
            <div className="mt-5 flex items-start gap-2 text-[12px] text-[var(--accent-red)] bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>You only have {formatCurrency(buyingPower)} available. Lower the allocation.</div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-dim)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={invalid || submitting || allocated <= 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent-primary)]/30 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Copy size={14} />
                  Start copying
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] text-[var(--text-dim)]">
            All trades are simulated. You can stop copying at any time.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes op-toast-in-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes op-modal-pop {
          0%   { transform: scale(0.94) translateY(6px); opacity: 0; }
          60%  { transform: scale(1.02) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────── */

function StatMini({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  const color =
    accent === "green" ? "text-[var(--accent-green)]" :
    accent === "red"   ? "text-[var(--accent-red)]" :
                         "text-[var(--text-primary)]";
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card-inner)] p-2.5">
      <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </div>
      <div className={`font-mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function ToggleRow({
  icon, title, description, checked, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
        checked
          ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[.03]"
          : "border-[var(--border-primary)] bg-[var(--bg-card-inner)] hover:border-[var(--text-dim)]"
      }`}
    >
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[var(--text-primary)]">
          {title}
        </div>
        <div className="text-[11px] text-[var(--text-muted)] leading-snug">
          {description}
        </div>
      </div>
      <div
        className={`shrink-0 w-9 h-5 rounded-full relative transition-colors ${
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-bar)]"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}
