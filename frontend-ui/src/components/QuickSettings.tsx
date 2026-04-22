"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Monitor, Globe2, ChevronDown, Check } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { CURRENCY_SYMBOLS } from "@/lib/utils";

const CURRENCIES: { code: string; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Pound Sterling" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
];

const MARKETS: { code: string; name: string; flag: string }[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
];

const THEMES: { code: "DARK" | "LIGHT" | "AUTO"; label: string; icon: typeof Moon }[] = [
  { code: "DARK", label: "Dark", icon: Moon },
  { code: "LIGHT", label: "Light", icon: Sun },
  { code: "AUTO", label: "Auto", icon: Monitor },
];

export default function QuickSettings() {
  const { theme, applyTheme, currency, setCurrency, market, setMarket } = usePortfolio();

  const [openMenu, setOpenMenu] = useState<"theme" | "market" | "currency" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const themeMeta = THEMES.find((t) => t.code === theme) ?? THEMES[0];
  const ThemeIcon = themeMeta.icon;
  const marketMeta = MARKETS.find((m) => m.code === market) ?? MARKETS[0];
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {/* Theme */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === "theme" ? null : "theme")}
          title="Theme"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all"
        >
          <ThemeIcon size={14} />
          <span className="text-[11px] font-semibold hidden md:inline">{themeMeta.label}</span>
          <ChevronDown size={10} className="opacity-50" />
        </button>
        {openMenu === "theme" && (
          <div className="absolute top-full right-0 mt-1 w-36 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-50 py-1">
            {THEMES.map(({ code, label, icon: Icon }) => {
              const active = theme === code;
              return (
                <button
                  key={code}
                  onClick={() => {
                    applyTheme(code);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left hover:bg-[var(--bg-muted)] transition-colors ${
                    active ? "bg-[var(--bg-muted)]/50" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                    <Icon size={12} />
                    {label}
                  </span>
                  {active && <Check size={12} className="text-[var(--accent-primary)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Market */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === "market" ? null : "market")}
          title="Market"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all"
        >
          <span className="text-sm leading-none">{marketMeta.flag}</span>
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
            {marketMeta.code}
          </span>
          <ChevronDown size={10} className="opacity-50" />
        </button>
        {openMenu === "market" && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-50 py-1">
            {MARKETS.map((m) => {
              const active = market === m.code;
              return (
                <button
                  key={m.code}
                  onClick={() => {
                    void setMarket(m.code);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left hover:bg-[var(--bg-muted)] transition-colors ${
                    active ? "bg-[var(--bg-muted)]/50" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{m.flag}</span>
                    <span className="text-xs text-[var(--text-primary)]">{m.name}</span>
                  </span>
                  {active && <Check size={12} className="text-[var(--accent-primary)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Currency */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === "currency" ? null : "currency")}
          title="Currency"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all"
        >
          <span className="font-mono text-[13px] font-bold text-[var(--text-primary)] leading-none">
            {currencySymbol.trim() || "$"}
          </span>
          <span className="text-[11px] font-semibold">{currency}</span>
          <ChevronDown size={10} className="opacity-50" />
        </button>
        {openMenu === "currency" && (
          <div className="absolute top-full right-0 mt-1 w-52 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-50 py-1 max-h-80 overflow-auto">
            {CURRENCIES.map((c) => {
              const active = currency === c.code;
              const sym = CURRENCY_SYMBOLS[c.code] ?? c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => {
                    void setCurrency(c.code);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left hover:bg-[var(--bg-muted)] transition-colors ${
                    active ? "bg-[var(--bg-muted)]/50" : ""
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-[var(--accent-primary)] w-6 inline-block">
                      {sym.trim() || c.code}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {c.code}
                      </span>
                      <span className="text-[10px] text-[var(--text-dim)]">{c.name}</span>
                    </span>
                  </span>
                  {active && <Check size={12} className="text-[var(--accent-primary)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
