"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Plus,
  Copy,
  Trash2,
  ChevronRight,
  BarChart3,
  Globe,
  Lock,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import {
  getStrategies,
  getBacktests,
  deleteStrategy,
  saveStrategy,
  type SavedStrategy,
  type SavedBacktest,
} from "@/lib/services/backtesting/storage";
import { STRATEGY_TEMPLATES } from "@/lib/services/backtesting/templates";

type Tab = "strategies" | "templates" | "results";

export default function BacktestingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("strategies");
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [backtests, setBacktests] = useState<SavedBacktest[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStrategies(getStrategies());
    setBacktests(getBacktests());
    setMounted(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteStrategy(id);
    setStrategies(getStrategies());
  };

  const cloneTemplate = (idx: number) => {
    const template = STRATEGY_TEMPLATES[idx];
    if (!template) return;
    const saved = saveStrategy({
      name: template.name,
      description: template.description,
      config: template.config,
    });
    router.push(`/backtesting/builder?id=${saved.id}`);
  };

  const fmt = (n: number, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;

  if (!mounted) return null;

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Backtesting"
          subtitle="Build, test, and optimize trading strategies against historical data"
          primaryButtonText="New Strategy"
          primaryButtonIcon="plus"
          onPrimaryClick={() => router.push("/backtesting/builder")}
        />

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] w-fit">
          {(["strategies", "templates", "results"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors capitalize ${
                tab === t
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "strategies"
                ? `My Strategies${strategies.length > 0 ? ` (${strategies.length})` : ""}`
                : t === "templates"
                ? "Templates"
                : `Past Results${backtests.length > 0 ? ` (${backtests.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* My Strategies */}
        {tab === "strategies" && (
          <div className="space-y-3">
            {strategies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
                <FlaskConical size={40} className="text-[var(--text-dim)]" />
                <p className="text-sm text-[var(--text-muted)]">
                  No strategies yet. Create one or clone a template.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push("/backtesting/builder")}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    <Plus size={14} /> Build From Scratch
                  </button>
                  <button
                    onClick={() => setTab("templates")}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Copy size={14} /> Browse Templates
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {strategies.map((s) => (
                  <div
                    key={s.id}
                    className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 flex flex-col gap-3 hover:border-[var(--border-muted)] transition-colors group cursor-pointer"
                    onClick={() =>
                      router.push(`/backtesting/builder?id=${s.id}`)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                          {s.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.config.indicators.map((ind) => (
                        <span
                          key={ind.id}
                          className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[var(--bg-muted)] text-[var(--accent-primary)]"
                        >
                          {ind.type}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border-primary)]">
                      <span className="text-[10px] text-[var(--text-dim)]">
                        Updated{" "}
                        {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id);
                        }}
                        className="p-1.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {tab === "templates" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {STRATEGY_TEMPLATES.map((t, i) => (
              <div
                key={i}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 flex flex-col gap-3"
              >
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    {t.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                        t.category === "MOMENTUM"
                          ? "bg-purple-500/20 text-purple-400"
                          : t.category === "MEAN_REVERSION"
                          ? "bg-blue-500/20 text-blue-400"
                          : t.category === "TREND_FOLLOWING"
                          ? "bg-green-500/20 text-green-400"
                          : t.category === "BREAKOUT"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {t.category.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                        t.difficulty === "Beginner"
                          ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                          : t.difficulty === "Intermediate"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                      }`}
                    >
                      {t.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] flex-1">
                  {t.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.config.indicators.map((ind) => (
                    <span
                      key={ind.id}
                      className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                    >
                      {ind.type}({Object.values(ind.params).join(",")})
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => cloneTemplate(i)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
                >
                  <Copy size={12} /> Use This Template
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Past Results */}
        {tab === "results" && (
          <div className="space-y-3">
            {backtests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
                <BarChart3 size={40} className="text-[var(--text-dim)]" />
                <p className="text-sm text-[var(--text-muted)]">
                  No backtests run yet. Create a strategy and test it.
                </p>
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[var(--bg-muted)] text-[10px] font-medium text-[var(--text-muted)] tracking-wide">
                  <div className="col-span-3">STRATEGY</div>
                  <div className="col-span-1">SYMBOL</div>
                  <div className="col-span-2">PERIOD</div>
                  <div className="col-span-1 text-right">RETURN</div>
                  <div className="col-span-1 text-right">WIN RATE</div>
                  <div className="col-span-1 text-right">TRADES</div>
                  <div className="col-span-1 text-right">SHARPE</div>
                  <div className="col-span-1 text-right">MAX DD</div>
                  <div className="col-span-1"></div>
                </div>
                {backtests.map((bt) => {
                  const s = bt.results?.statistics;
                  return (
                    <div
                      key={bt.id}
                      onClick={() =>
                        router.push(`/backtesting/results/${bt.id}`)
                      }
                      className="grid grid-cols-12 gap-2 px-5 py-3 border-t border-[var(--border-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group"
                    >
                      <div className="col-span-3 text-sm text-[var(--text-primary)] font-medium truncate">
                        {bt.strategy_name}
                      </div>
                      <div className="col-span-1 font-mono text-xs text-[var(--accent-primary)]">
                        {bt.symbol}
                      </div>
                      <div className="col-span-2 text-xs text-[var(--text-muted)]">
                        {bt.start_date.slice(0, 7)} →{" "}
                        {bt.end_date.slice(0, 7)}
                      </div>
                      <div
                        className={`col-span-1 text-right text-xs font-mono font-medium ${
                          (s?.totalReturnPercent ?? 0) >= 0
                            ? "text-[var(--accent-green)]"
                            : "text-[var(--accent-red)]"
                        }`}
                      >
                        {s ? fmt(s.totalReturnPercent) : "—"}
                      </div>
                      <div className="col-span-1 text-right text-xs font-mono text-[var(--text-secondary)]">
                        {s ? `${s.winRate.toFixed(0)}%` : "—"}
                      </div>
                      <div className="col-span-1 text-right text-xs font-mono text-[var(--text-secondary)]">
                        {s?.totalTrades ?? "—"}
                      </div>
                      <div className="col-span-1 text-right text-xs font-mono text-[var(--text-secondary)]">
                        {s ? s.sharpeRatio.toFixed(2) : "—"}
                      </div>
                      <div className="col-span-1 text-right text-xs font-mono text-[var(--accent-red)]">
                        {s
                          ? `-${s.maxDrawdownPercent.toFixed(1)}%`
                          : "—"}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <ChevronRight
                          size={14}
                          className="text-[var(--text-dim)] group-hover:text-[var(--accent-primary)] transition-colors"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
