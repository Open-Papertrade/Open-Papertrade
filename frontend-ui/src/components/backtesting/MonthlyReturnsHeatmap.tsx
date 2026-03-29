"use client";

import type { MonthlyReturn } from "@/types/backtesting";

interface Props {
  returns: MonthlyReturn[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getColor(value: number): string {
  if (value === 0) return "var(--bg-muted)";
  if (value > 0) {
    const intensity = Math.min(value / 10, 1);
    return `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`;
  }
  const intensity = Math.min(Math.abs(value) / 10, 1);
  return `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`;
}

export default function MonthlyReturnsHeatmap({ returns }: Props) {
  if (returns.length === 0) return null;

  const years = [...new Set(returns.map((r) => r.year))].sort();

  // Build lookup
  const lookup: Record<string, number> = {};
  for (const r of returns) {
    lookup[`${r.year}-${r.month}`] = r.returnPercent;
  }

  // Yearly totals
  const yearTotals: Record<number, number> = {};
  for (const year of years) {
    yearTotals[year] = returns
      .filter((r) => r.year === year)
      .reduce((sum, r) => sum + r.returnPercent, 0);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left text-[var(--text-muted)] font-medium">
              Year
            </th>
            {MONTHS.map((m) => (
              <th
                key={m}
                className="px-2 py-1.5 text-center text-[var(--text-muted)] font-medium"
              >
                {m}
              </th>
            ))}
            <th className="px-2 py-1.5 text-center text-[var(--text-muted)] font-medium">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year}>
              <td className="px-2 py-1 text-[var(--text-secondary)] font-medium">
                {year}
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const val = lookup[`${year}-${month}`];
                return (
                  <td key={month} className="px-1 py-1">
                    {val !== undefined ? (
                      <div
                        className="px-2 py-1.5 rounded text-center text-[11px]"
                        style={{
                          backgroundColor: getColor(val),
                          color:
                            Math.abs(val) > 3
                              ? "white"
                              : "var(--text-secondary)",
                        }}
                      >
                        {val >= 0 ? "+" : ""}
                        {val.toFixed(1)}%
                      </div>
                    ) : (
                      <div className="px-2 py-1.5 text-center text-[var(--text-dim)]">
                        —
                      </div>
                    )}
                  </td>
                );
              })}
              <td className="px-1 py-1">
                <div
                  className="px-2 py-1.5 rounded text-center font-semibold text-[11px]"
                  style={{
                    backgroundColor: getColor(yearTotals[year] / 2),
                    color:
                      Math.abs(yearTotals[year]) > 5
                        ? "white"
                        : "var(--text-secondary)",
                  }}
                >
                  {yearTotals[year] >= 0 ? "+" : ""}
                  {yearTotals[year].toFixed(1)}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
