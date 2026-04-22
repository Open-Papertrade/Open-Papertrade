"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import QuickSettings from "@/components/QuickSettings";
import AdvancedChart from "@/components/chart/AdvancedChart";
import { IndicatorId, ChartMode, Drawing } from "@/components/chart/types";
import { TimeRange, stockAPI } from "@/lib/api";
import { Search } from "lucide-react";

const PRESET_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
];

interface ChartLayout {
  timeframe: TimeRange;
  mode: ChartMode;
  indicators: IndicatorId[];
  drawings: Drawing[];
  logScale: boolean;
  compareSymbols: string[];
  showVolumeProfile: boolean;
  showNews: boolean;
}

const LAYOUT_KEY = (symbol: string) => `chart_layout_${symbol.toUpperCase()}`;

function loadLayout(symbol: string): Partial<ChartLayout> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(LAYOUT_KEY(symbol));
    if (!raw) return undefined;
    return JSON.parse(raw) as ChartLayout;
  } catch {
    return undefined;
  }
}

function saveLayout(symbol: string, layout: ChartLayout) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_KEY(symbol), JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export default function ChartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [symbol, setSymbol] = useState("AAPL");
  const [symbolName, setSymbolName] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [layout, setLayout] = useState<Partial<ChartLayout> | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from URL + localStorage only after mount so SSR and first client render match
  useEffect(() => {
    const urlSymbol = searchParams.get("symbol")?.toUpperCase();
    if (urlSymbol) setSymbol(urlSymbol);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload layout when symbol changes (client only)
  useEffect(() => {
    if (!hydrated) return;
    setLayout(loadLayout(symbol));
    stockAPI
      .getProfile(symbol)
      .then((p) => setSymbolName(typeof p.name === "string" ? p.name : undefined))
      .catch(() => setSymbolName(undefined));
  }, [symbol, hydrated]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("symbol", symbol);
    router.replace(`/chart?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const handleStateChange = useCallback(
    (state: ChartLayout) => {
      saveLayout(symbol, state);
    },
    [symbol]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSymbol(searchInput.trim().toUpperCase());
      setSearchInput("");
    }
  };

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-4 py-6 px-8 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[28px] font-medium tracking-[-0.5px] text-[var(--text-primary)]">
              Chart Analysis
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Multi-pane technical analysis with indicators, drawing tools, and saved layouts
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <QuickSettings />
            <div className="w-px h-6 bg-[var(--border-primary)]" />
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search symbol…"
                  className="pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)] outline-none w-44"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-black text-xs font-semibold hover:brightness-110 transition-all"
              >
                Load
              </button>
            </form>
          </div>
        </header>

        {/* Preset symbol chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_SYMBOLS.map((s) => (
            <button
              key={s.symbol}
              onClick={() => setSymbol(s.symbol)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono transition-all ${
                symbol === s.symbol
                  ? "bg-[var(--accent-primary)] text-black"
                  : "bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50"
              }`}
            >
              {s.symbol}
            </button>
          ))}
        </div>

        {/* Chart — only mount after hydration so localStorage-derived state doesn't break SSR */}
        {hydrated ? (
          <AdvancedChart
            key={symbol}
            symbol={symbol}
            symbolName={symbolName}
            initialState={layout}
            onStateChange={handleStateChange}
            height={620}
          />
        ) : (
          <div
            className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]"
            style={{ height: 620 }}
          />
        )}

        {/* Tip strip */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-[11px] text-[var(--text-muted)]">
          <span className="text-[var(--accent-primary)]">Tip:</span>
          <span>
            Pick a drawing tool from the left toolbar, then click two points on the chart
            (first click sets the start, second click completes). Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-muted)] rounded text-[10px] font-mono">Esc</kbd> to cancel.
            Layouts auto-save per symbol.
          </span>
        </div>
      </main>
    </div>
  );
}
