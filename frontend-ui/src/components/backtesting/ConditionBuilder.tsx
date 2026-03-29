"use client";

import { Plus, X } from "lucide-react";
import type {
  ConditionGroup,
  ConditionRule,
  ConditionOperator,
  IndicatorConfig,
} from "@/types/backtesting";
import { OPERATOR_LABELS } from "@/types/backtesting";
import { getIndicatorKeys } from "@/types/backtesting";

interface Props {
  label: string;
  group: ConditionGroup;
  indicators: IndicatorConfig[];
  onChange: (group: ConditionGroup) => void;
}

const OPERATORS: ConditionOperator[] = [
  "LESS_THAN",
  "GREATER_THAN",
  "LESS_EQUAL",
  "GREATER_EQUAL",
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "EQUALS",
];

export default function ConditionBuilder({
  label,
  group,
  indicators,
  onChange,
}: Props) {
  // Build available operand keys from indicators
  const operandKeys = [
    "PRICE",
    "OPEN",
    "HIGH",
    "LOW",
    "VOLUME",
    ...indicators.flatMap((i) => getIndicatorKeys(i)),
  ];

  const addRule = () => {
    const newRule: ConditionRule = {
      id: `rule_${Date.now()}`,
      leftOperand: operandKeys[0] || "PRICE",
      operator: "GREATER_THAN",
      rightType: "NUMBER",
      rightValue: 0,
    };
    onChange({ ...group, rules: [...group.rules, newRule] });
  };

  const removeRule = (id: string) => {
    onChange({ ...group, rules: group.rules.filter((r) => r.id !== id) });
  };

  const updateRule = (id: string, updates: Partial<ConditionRule>) => {
    onChange({
      ...group,
      rules: group.rules.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    });
  };

  const toggleLogic = () => {
    onChange({ ...group, logic: group.logic === "AND" ? "OR" : "AND" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </h3>
        <div className="flex items-center gap-2">
          {group.rules.length > 1 && (
            <button
              onClick={toggleLogic}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                group.logic === "AND"
                  ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                  : "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
              }`}
            >
              {group.logic}
            </button>
          )}
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Plus size={12} /> Rule
          </button>
        </div>
      </div>

      {group.rules.length === 0 && (
        <div className="text-xs text-[var(--text-muted)] py-4 text-center border border-dashed border-[var(--border-muted)] rounded-lg">
          No conditions set. Add rules to define when to {label.toLowerCase().includes("entry") ? "enter" : "exit"} trades.
        </div>
      )}

      <div className="space-y-2">
        {group.rules.map((rule, idx) => (
          <div key={rule.id}>
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <span className="text-[10px] font-bold text-[var(--text-dim)]">
                  {group.logic}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)] group">
              {/* Left operand */}
              <select
                value={rule.leftOperand}
                onChange={(e) =>
                  updateRule(rule.id, { leftOperand: e.target.value })
                }
                className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                {operandKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={rule.operator}
                onChange={(e) =>
                  updateRule(rule.id, {
                    operator: e.target.value as ConditionOperator,
                  })
                }
                className="w-[120px] px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>

              {/* Right value type toggle + value */}
              <select
                value={rule.rightType}
                onChange={(e) => {
                  const rightType = e.target.value as ConditionRule["rightType"];
                  updateRule(rule.id, {
                    rightType,
                    rightValue:
                      rightType === "NUMBER"
                        ? 0
                        : rightType === "PRICE"
                        ? "PRICE"
                        : operandKeys[0] || "PRICE",
                  });
                }}
                className="w-20 px-2 py-1.5 text-[10px] bg-[var(--bg-muted)] text-[var(--text-muted)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                <option value="NUMBER">Value</option>
                <option value="INDICATOR">Indicator</option>
                <option value="PRICE">Price</option>
              </select>

              {rule.rightType === "NUMBER" ? (
                <input
                  type="number"
                  value={rule.rightValue}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      rightValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-20 px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              ) : (
                <select
                  value={String(rule.rightValue)}
                  onChange={(e) =>
                    updateRule(rule.id, { rightValue: e.target.value })
                  }
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  {operandKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => removeRule(rule.id)}
                className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--accent-red)] hover:bg-[var(--bg-muted)] transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
