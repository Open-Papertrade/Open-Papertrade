"use client";

import type { StrategyConfig } from "@/types/backtesting";
import {
  OPERATOR_LABELS,
  POSITION_SIZING_LABELS,
  STOP_LOSS_LABELS,
  TAKE_PROFIT_LABELS,
} from "@/types/backtesting";

interface Props {
  config: StrategyConfig;
  className?: string;
}

export default function StrategySummary({ config, className = "" }: Props) {
  const formatCondition = (group: typeof config.entryConditions, verb: string) => {
    if (!group.rules.length) return null;
    const parts = group.rules.map((rule) => {
      const right =
        rule.rightType === "NUMBER"
          ? String(rule.rightValue)
          : String(rule.rightValue);
      return `${rule.leftOperand} ${OPERATOR_LABELS[rule.operator]} ${right}`;
    });
    const joiner = group.logic === "AND" ? " and " : " or ";
    return `${verb} when ${parts.join(joiner)}`;
  };

  const entry = formatCondition(config.entryConditions, "Enter");
  const exit = formatCondition(config.exitConditions, "Exit");
  const direction = config.tradeDirection === "LONG" ? "Long only" : config.tradeDirection === "SHORT" ? "Short only" : "Long & Short";

  return (
    <div
      className={`p-4 bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)] space-y-2 ${className}`}
    >
      <h4 className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
        STRATEGY SUMMARY
      </h4>

      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
        <div className="flex items-start gap-2">
          <span className="text-[var(--accent-primary)] font-mono font-bold shrink-0">
            DIR
          </span>
          <span>{direction}</span>
        </div>

        {config.indicators.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-primary)] font-mono font-bold shrink-0">
              IND
            </span>
            <span>
              {config.indicators
                .map(
                  (i) =>
                    `${i.type}(${Object.values(i.params).join(",")})`
                )
                .join(", ")}
            </span>
          </div>
        )}

        {entry && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-green)] font-mono font-bold shrink-0">
              BUY
            </span>
            <span>{entry.replace("Enter when ", "")}</span>
          </div>
        )}

        {exit && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-red)] font-mono font-bold shrink-0">
              SELL
            </span>
            <span>{exit.replace("Exit when ", "")}</span>
          </div>
        )}

        <div className="flex items-start gap-2">
          <span className="text-[var(--text-muted)] font-mono font-bold shrink-0">
            SIZE
          </span>
          <span>
            {POSITION_SIZING_LABELS[config.positionSizing.method]}
            {config.positionSizing.method !== "KELLY_CRITERION" &&
              ` — ${config.positionSizing.value}${config.positionSizing.method === "FIXED_AMOUNT" ? "$" : "%"}`}
          </span>
        </div>

        {config.stopLoss && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-red)] font-mono font-bold shrink-0">
              S/L
            </span>
            <span>
              {STOP_LOSS_LABELS[config.stopLoss.type]} — {config.stopLoss.value}
              {config.stopLoss.type === "ATR_MULTIPLE" ? "x" : "%"}
            </span>
          </div>
        )}

        {config.takeProfit && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-green)] font-mono font-bold shrink-0">
              T/P
            </span>
            <span>
              {TAKE_PROFIT_LABELS[config.takeProfit.type]} —{" "}
              {config.takeProfit.value}
              {config.takeProfit.type === "RISK_REWARD_RATIO" ? ":1" : "%"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
