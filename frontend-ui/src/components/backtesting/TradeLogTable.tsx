"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { BacktestTradeEntry } from "@/types/backtesting";

interface Props {
  trades: BacktestTradeEntry[];
}

type SortKey = "entryDate" | "exitDate" | "pnl" | "pnlPercent" | "holdingBars";

// Defensive formatters — the backend sometimes returns null / NaN for edge-case trades.
function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function fmt(v: unknown, digits = 2): string {
  const n = toNum(v);
  return n === null ? "—" : n.toFixed(digits);
}
function fmtSigned(v: unknown, digits = 2): string {
  const n = toNum(v);
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}
function pnlIsPositive(v: unknown): boolean {
  const n = toNum(v);
  return n !== null && n >= 0;
}
function safeStr(v: unknown): string {
  return typeof v === "string" && v.trim() ? v : "";
}

export default function TradeLogTable({ trades }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("entryDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 20;

  const sorted = [...trades].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "entryDate":
        cmp = safeStr(a.entryDate).localeCompare(safeStr(b.entryDate));
        break;
      case "exitDate":
        cmp = safeStr(a.exitDate).localeCompare(safeStr(b.exitDate));
        break;
      case "pnl":
        cmp = (toNum(a.pnl) ?? 0) - (toNum(b.pnl) ?? 0);
        break;
      case "pnlPercent":
        cmp = (toNum(a.pnlPercent) ?? 0) - (toNum(b.pnlPercent) ?? 0);
        break;
      case "holdingBars":
        cmp = (toNum(a.holdingBars) ?? 0) - (toNum(b.holdingBars) ?? 0);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(trades.length / perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const exportCsv = () => {
    const header =
      "Entry Date,Exit Date,Direction,Entry Price,Exit Price,Shares,P/L ($),P/L (%),Exit Reason,Holding Days\n";
    const rows = trades
      .map((t) =>
        [
          safeStr(t.entryDate),
          safeStr(t.exitDate),
          safeStr(t.direction),
          fmt(t.entryPrice, 2),
          fmt(t.exitPrice, 2),
          toNum(t.shares) ?? "",
          fmt(t.pnl, 2),
          fmt(t.pnlPercent, 2),
          safeStr(t.exitReason),
          toNum(t.holdingBars) ?? "",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backtest_trades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
    >
      {label}
      {sortKey === field && (
        <ChevronDown
          size={10}
          className={`transition-transform ${sortAsc ? "rotate-180" : ""}`}
        />
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          {trades.length} trades
        </span>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Download size={12} /> CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-primary)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--bg-muted)]">
              <th className="px-3 py-2.5 text-left font-medium">
                <SortHeader label="Entry" field="entryDate" />
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                <SortHeader label="Exit" field="exitDate" />
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">
                Dir
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[var(--text-muted)]">
                Entry $
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[var(--text-muted)]">
                Exit $
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[var(--text-muted)]">
                Shares
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                <SortHeader label="P/L $" field="pnl" />
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                <SortHeader label="P/L %" field="pnlPercent" />
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">
                Reason
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                <SortHeader label="Days" field="holdingBars" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((t, i) => {
              const pnlPos = pnlIsPositive(t.pnl);
              const pnlPctPos = pnlIsPositive(t.pnlPercent);
              const direction = safeStr(t.direction);
              const exitReason = safeStr(t.exitReason);
              return (
                <tr
                  key={i}
                  className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">
                    {safeStr(t.entryDate) || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">
                    {safeStr(t.exitDate) || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {direction ? (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          direction === "LONG"
                            ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                            : "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                        }`}
                      >
                        {direction}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">
                    ${fmt(t.entryPrice, 2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">
                    ${fmt(t.exitPrice, 2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)]">
                    {toNum(t.shares) ?? "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-medium ${
                      pnlPos
                        ? "text-[var(--accent-green)]"
                        : toNum(t.pnl) === null
                        ? "text-[var(--text-muted)]"
                        : "text-[var(--accent-red)]"
                    }`}
                  >
                    {toNum(t.pnl) === null ? "—" : `${pnlPos ? "+" : ""}$${fmt(t.pnl, 2)}`}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-medium ${
                      pnlPctPos
                        ? "text-[var(--accent-green)]"
                        : toNum(t.pnlPercent) === null
                        ? "text-[var(--text-muted)]"
                        : "text-[var(--accent-red)]"
                    }`}
                  >
                    {toNum(t.pnlPercent) === null
                      ? "—"
                      : `${fmtSigned(t.pnlPercent, 2)}%`}
                  </td>
                  <td className="px-3 py-2">
                    {exitReason ? (
                      <span
                        className={`text-[10px] font-medium ${
                          exitReason === "STOP_LOSS"
                            ? "text-[var(--accent-red)]"
                            : exitReason === "TAKE_PROFIT"
                            ? "text-[var(--accent-green)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {exitReason.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-muted)]">
                    {toNum(t.holdingBars) !== null ? `${toNum(t.holdingBars)}d` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 text-xs rounded bg-[var(--bg-muted)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-hover)] transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 text-xs rounded bg-[var(--bg-muted)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-hover)] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
