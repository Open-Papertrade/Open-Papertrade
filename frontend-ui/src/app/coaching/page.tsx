"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  BarChart3,
  Target,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import ScoreRadar from "@/components/coaching/ScoreRadar";
import PatternCard from "@/components/coaching/PatternCard";
import TipCard from "@/components/coaching/TipCard";
import CoachChat from "@/components/coaching/CoachChat";
import { API_HOST } from "@/lib/api";

type Tab = "overview" | "patterns" | "tips" | "chat";

interface DashboardData {
  portfolio: any;
  patterns: any[];
  scores: any;
  tips: any[];
  llmAvailable: boolean;
  model: string | null;
}

export default function CoachingPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_HOST}/api/users/coaching/dashboard/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load coaching data");
      const d = await res.json();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--text-muted)]">Analyzing your trading...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-[var(--accent-red)]">{error}</p>
          <button onClick={loadDashboard} className="text-xs text-[var(--accent-primary)] hover:underline">
            Retry
          </button>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const { portfolio, patterns, scores, tips, llmAvailable, model } = data;
  const hasData = portfolio?.hasData;
  const summary = portfolio?.summary || {};
  const scoreData = scores?.hasData ? scores : null;
  const warningPatterns = patterns.filter((p: any) => p.severity === "danger" || p.severity === "warning");
  const positivePatterns = patterns.filter((p: any) => p.severity === "positive");

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="AI Coach"
          subtitle="Personalized insights, behavioral analysis, and trading improvement"
        />

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
            <Brain size={48} className="text-[var(--text-dim)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {portfolio?.message || "Make some trades to unlock coaching insights."}
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] w-fit">
              {([
                { key: "overview", label: "Overview", icon: <BarChart3 size={12} /> },
                { key: "patterns", label: `Patterns (${patterns.length})`, icon: <AlertTriangle size={12} /> },
                { key: "tips", label: `Tips (${tips.length})`, icon: <Lightbulb size={12} /> },
                { key: "chat", label: "AI Chat", icon: <MessageSquare size={12} /> },
              ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                    tab === t.key
                      ? "bg-[var(--accent-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ── */}
            {tab === "overview" && (
              <div className="flex gap-6">
                {/* Left: Stats + Quick Insights */}
                <div className="flex-1 space-y-5">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <StatCard label="Total Trades" value={String(summary.totalTrades)} />
                    <StatCard
                      label="Win Rate"
                      value={`${summary.winRate}%`}
                      positive={summary.winRate > 50}
                    />
                    <StatCard
                      label="Return"
                      value={`${summary.totalReturnPct >= 0 ? "+" : ""}${summary.totalReturnPct}%`}
                      positive={summary.totalReturnPct >= 0}
                    />
                    <StatCard
                      label="Avg Hold"
                      value={`${summary.avgHoldDays}d`}
                    />
                  </div>

                  {/* Warning Patterns */}
                  {warningPatterns.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide flex items-center gap-2">
                        <AlertTriangle size={12} className="text-yellow-500" />
                        AREAS TO WATCH
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {warningPatterns.slice(0, 4).map((p: any) => (
                          <PatternCard key={p.id} pattern={p} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positive Patterns */}
                  {positivePatterns.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide flex items-center gap-2">
                        <TrendingUp size={12} className="text-[var(--accent-green)]" />
                        WHAT YOU&apos;RE DOING WELL
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {positivePatterns.map((p: any) => (
                          <PatternCard key={p.id} pattern={p} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Tips */}
                  {tips.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide flex items-center gap-2">
                        <Lightbulb size={12} className="text-[var(--accent-primary)]" />
                        TOP RECOMMENDATIONS
                      </h3>
                      <div className="space-y-2">
                        {tips.slice(0, 3).map((tip: any) => (
                          <TipCard key={tip.id} tip={tip} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Score Radar */}
                <div className="w-[320px] shrink-0 space-y-5">
                  {scoreData && (
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
                      <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide mb-4">
                        TRADING SCORE
                      </h3>
                      <ScoreRadar
                        scores={scoreData.scores}
                        overall={scoreData.overall}
                        grade={scoreData.grade}
                      />
                    </div>
                  )}

                  {/* Portfolio Summary */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-3">
                    <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
                      PORTFOLIO SNAPSHOT
                    </h3>
                    <div className="space-y-2">
                      <SummaryRow label="Net Worth" value={`$${summary.netWorth?.toLocaleString()}`} />
                      <SummaryRow label="Realized P&L" value={`$${summary.realizedPnl?.toLocaleString()}`}
                        positive={summary.realizedPnl >= 0} />
                      <SummaryRow label="Trades/Week" value={String(summary.tradesPerWeek)} />
                      <SummaryRow label="Holdings" value={String(summary.holdingsCount)} />
                      <SummaryRow label="Avg Trade Size" value={`$${summary.avgTradeSize?.toLocaleString()}`} />
                    </div>
                  </div>

                  {/* Concentration */}
                  {portfolio.concentration?.breakdown && Object.keys(portfolio.concentration.breakdown).length > 0 && (
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-3">
                      <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
                        CONCENTRATION
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(portfolio.concentration.breakdown)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .slice(0, 5)
                          .map(([sym, pct]: any) => (
                            <div key={sym} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-mono text-[var(--text-secondary)]">{sym}</span>
                                <span className={`font-mono ${pct > 30 ? "text-[var(--accent-red)]" : "text-[var(--text-muted)]"}`}>
                                  {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: pct > 30 ? "var(--accent-red)" : "var(--accent-primary)",
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Patterns Tab ── */}
            {tab === "patterns" && (
              <div className="space-y-4">
                {patterns.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
                    <Brain size={40} className="text-[var(--text-dim)]" />
                    <p className="text-sm text-[var(--text-muted)]">
                      No patterns detected yet. Keep trading and patterns will emerge.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {patterns.map((p: any) => (
                      <PatternCard key={p.id} pattern={p} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tips Tab ── */}
            {tab === "tips" && (
              <div className="space-y-3 max-w-3xl">
                {tips.map((tip: any) => (
                  <TipCard key={tip.id} tip={tip} />
                ))}
              </div>
            )}

            {/* ── Chat Tab ── */}
            {tab === "chat" && (
              <CoachChat available={llmAvailable} model={model} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
      <span className="text-[10px] font-medium text-[var(--text-muted)] tracking-wide">
        {label}
      </span>
      <div
        className={`font-mono text-xl font-semibold mt-1 ${
          positive === undefined
            ? "text-[var(--text-primary)]"
            : positive
            ? "text-[var(--accent-green)]"
            : "text-[var(--accent-red)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
      <span
        className={`text-[11px] font-mono font-medium ${
          positive === undefined
            ? "text-[var(--text-primary)]"
            : positive
            ? "text-[var(--accent-green)]"
            : "text-[var(--accent-red)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
