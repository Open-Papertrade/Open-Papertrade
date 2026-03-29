"use client";

import { Info } from "lucide-react";
import type {
  PositionSizingConfig,
  PositionSizingMethod,
  StopLossConfig,
  TakeProfitConfig,
  StopLossType,
  TakeProfitType,
} from "@/types/backtesting";
import {
  POSITION_SIZING_LABELS,
  STOP_LOSS_LABELS,
  TAKE_PROFIT_LABELS,
} from "@/types/backtesting";

interface Props {
  positionSizing: PositionSizingConfig;
  stopLoss?: StopLossConfig;
  takeProfit?: TakeProfitConfig;
  onPositionSizingChange: (ps: PositionSizingConfig) => void;
  onStopLossChange: (sl: StopLossConfig | undefined) => void;
  onTakeProfitChange: (tp: TakeProfitConfig | undefined) => void;
}

const PS_METHODS: PositionSizingMethod[] = [
  "FIXED_AMOUNT",
  "PERCENT_PORTFOLIO",
  "PERCENT_RISK",
  "KELLY_CRITERION",
];

const SL_TYPES: StopLossType[] = ["PERCENT", "ATR_MULTIPLE", "TRAILING_PERCENT", "FIXED_PRICE"];
const TP_TYPES: TakeProfitType[] = ["PERCENT", "RISK_REWARD_RATIO", "FIXED_PRICE"];

const PS_UNITS: Record<PositionSizingMethod, string> = {
  FIXED_AMOUNT: "$",
  PERCENT_PORTFOLIO: "%",
  PERCENT_RISK: "%",
  KELLY_CRITERION: "",
};

const PS_HINTS: Record<PositionSizingMethod, string> = {
  FIXED_AMOUNT: "Fixed dollar amount per trade",
  PERCENT_PORTFOLIO: "Percentage of total equity per trade",
  PERCENT_RISK: "% of equity you're willing to lose if stop-loss hits",
  KELLY_CRITERION: "Optimal fraction based on win rate and payoff ratio (auto-calculated after 5+ trades)",
};

export default function PositionSizingPanel({
  positionSizing,
  stopLoss,
  takeProfit,
  onPositionSizingChange,
  onStopLossChange,
  onTakeProfitChange,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Position Sizing */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Position Sizing
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PS_METHODS.map((method) => (
            <button
              key={method}
              onClick={() =>
                onPositionSizingChange({
                  method,
                  value: method === "FIXED_AMOUNT" ? 10000 : method === "KELLY_CRITERION" ? 0 : 10,
                })
              }
              className={`px-3 py-2 text-xs rounded-lg text-left transition-colors border ${
                positionSizing.method === method
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                  : "border-[var(--border-primary)] bg-[var(--bg-card-inner)] text-[var(--text-secondary)] hover:border-[var(--border-muted)]"
              }`}
            >
              {POSITION_SIZING_LABELS[method]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group/tip">
            <Info size={12} className="text-[var(--text-dim)]" />
            <div className="absolute left-0 bottom-full mb-1 w-56 p-2 bg-[var(--bg-muted)] rounded-lg text-[10px] text-[var(--text-secondary)] hidden group-hover/tip:block z-10 border border-[var(--border-primary)]">
              {PS_HINTS[positionSizing.method]}
            </div>
          </div>
          {positionSizing.method !== "KELLY_CRITERION" && (
            <div className="flex items-center gap-1.5 flex-1">
              {PS_UNITS[positionSizing.method] === "$" && (
                <span className="text-xs text-[var(--text-muted)]">$</span>
              )}
              <input
                type="number"
                value={positionSizing.value}
                onChange={(e) =>
                  onPositionSizingChange({
                    ...positionSizing,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-24 px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
              {PS_UNITS[positionSizing.method] === "%" && (
                <span className="text-xs text-[var(--text-muted)]">%</span>
              )}
            </div>
          )}
          {positionSizing.method === "KELLY_CRITERION" && (
            <span className="text-[10px] text-[var(--text-muted)]">
              Auto-calculated from backtest results (half-Kelly, capped at 25%)
            </span>
          )}
        </div>
      </div>

      {/* Stop Loss */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Stop Loss
          </h3>
          <button
            onClick={() =>
              stopLoss
                ? onStopLossChange(undefined)
                : onStopLossChange({ type: "PERCENT", value: 5 })
            }
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
              stopLoss
                ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                : "bg-[var(--bg-muted)] text-[var(--text-dim)]"
            }`}
          >
            {stopLoss ? "ON" : "OFF"}
          </button>
        </div>

        {stopLoss && (
          <div className="flex items-center gap-2">
            <select
              value={stopLoss.type}
              onChange={(e) =>
                onStopLossChange({
                  ...stopLoss,
                  type: e.target.value as StopLossType,
                })
              }
              className="px-2 py-1.5 text-xs bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
            >
              {SL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {STOP_LOSS_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={stopLoss.value}
              onChange={(e) =>
                onStopLossChange({
                  ...stopLoss,
                  value: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
            <span className="text-xs text-[var(--text-muted)]">
              {stopLoss.type === "PERCENT" || stopLoss.type === "TRAILING_PERCENT"
                ? "%"
                : stopLoss.type === "ATR_MULTIPLE"
                ? "x ATR"
                : "$"}
            </span>
          </div>
        )}
      </div>

      {/* Take Profit */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Take Profit
          </h3>
          <button
            onClick={() =>
              takeProfit
                ? onTakeProfitChange(undefined)
                : onTakeProfitChange({ type: "PERCENT", value: 15 })
            }
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
              takeProfit
                ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                : "bg-[var(--bg-muted)] text-[var(--text-dim)]"
            }`}
          >
            {takeProfit ? "ON" : "OFF"}
          </button>
        </div>

        {takeProfit && (
          <div className="flex items-center gap-2">
            <select
              value={takeProfit.type}
              onChange={(e) =>
                onTakeProfitChange({
                  ...takeProfit,
                  type: e.target.value as TakeProfitType,
                })
              }
              className="px-2 py-1.5 text-xs bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
            >
              {TP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TAKE_PROFIT_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={takeProfit.value}
              onChange={(e) =>
                onTakeProfitChange({
                  ...takeProfit,
                  value: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
            <span className="text-xs text-[var(--text-muted)]">
              {takeProfit.type === "PERCENT"
                ? "%"
                : takeProfit.type === "RISK_REWARD_RATIO"
                ? ": 1 R/R"
                : "$"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
