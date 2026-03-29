"use client";

import { Plus, X, Info } from "lucide-react";
import { useState } from "react";
import type { IndicatorConfig, IndicatorType } from "@/types/backtesting";
import { INDICATOR_DEFAULTS } from "@/types/backtesting";

interface Props {
  indicators: IndicatorConfig[];
  onChange: (indicators: IndicatorConfig[]) => void;
}

const INDICATOR_TYPES: IndicatorType[] = [
  "RSI", "SMA", "EMA", "MACD", "BOLLINGER", "ATR", "STOCHASTIC", "VWAP", "OBV",
];

export default function IndicatorSelector({ indicators, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  const addIndicator = (type: IndicatorType) => {
    const defaults = INDICATOR_DEFAULTS[type];
    const newInd: IndicatorConfig = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      type,
      params: { ...defaults.params },
      source: defaults.source,
    };
    onChange([...indicators, newInd]);
    setShowAdd(false);
  };

  const removeIndicator = (id: string) => {
    onChange(indicators.filter((i) => i.id !== id));
  };

  const updateParam = (id: string, key: string, value: number) => {
    onChange(
      indicators.map((i) =>
        i.id === id ? { ...i, params: { ...i.params, [key]: value } } : i
      )
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Technical Indicators
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {showAdd && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)]">
          {INDICATOR_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addIndicator(type)}
              className="px-3 py-2 text-xs font-mono font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors text-left"
            >
              <div>{type}</div>
              <div className="text-[10px] text-[var(--text-dim)] mt-0.5 font-primary">
                {INDICATOR_DEFAULTS[type].description.split("—")[0].trim()}
              </div>
            </button>
          ))}
        </div>
      )}

      {indicators.length === 0 && !showAdd && (
        <div className="text-xs text-[var(--text-muted)] py-4 text-center border border-dashed border-[var(--border-muted)] rounded-lg">
          No indicators added yet. Click &quot;Add&quot; to get started.
        </div>
      )}

      <div className="space-y-2">
        {indicators.map((ind) => (
          <div
            key={ind.id}
            className="flex items-start gap-3 p-3 bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)] group"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-[var(--accent-primary)]">
                  {ind.type}
                </span>
                <div className="group/tip relative">
                  <Info size={12} className="text-[var(--text-dim)]" />
                  <div className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-[var(--bg-muted)] rounded-lg text-[10px] text-[var(--text-secondary)] hidden group-hover/tip:block z-10 border border-[var(--border-primary)]">
                    {INDICATOR_DEFAULTS[ind.type].description}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ind.params).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] capitalize">
                      {key}:
                    </span>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        updateParam(ind.id, key, parseInt(e.target.value) || 0)
                      }
                      className="w-16 px-2 py-1 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() => removeIndicator(ind.id)}
              className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--accent-red)] hover:bg-[var(--bg-muted)] transition-colors opacity-0 group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
