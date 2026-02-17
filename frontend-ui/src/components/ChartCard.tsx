"use client";

interface BarData {
  label: string;
  value1: number;
  value2: number;
  isActive?: boolean;
}

const chartData: BarData[] = [
  { label: "Mon", value1: 80, value2: 50 },
  { label: "Tue", value1: 110, value2: 70 },
  { label: "Wed", value1: 90, value2: 60 },
  { label: "Thu", value1: 130, value2: 85 },
  { label: "Fri", value1: 100, value2: 75, isActive: true },
  { label: "Sat", value1: 70, value2: 45 },
  { label: "Sun", value1: 55, value2: 35 },
];

export default function ChartCard() {
  return (
    <div className="flex-1 bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)] flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Weekly Performance
        </span>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            <span className="text-[11px] text-[#ADADB0]">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-muted)]" />
            <span className="text-[11px] text-[#ADADB0]">Expenses</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 flex items-end justify-around gap-3 pt-5 border-t border-[var(--border-primary)]">
        {chartData.map((bar, index) => (
          <div key={index} className="flex flex-col items-center gap-2.5">
            {/* Bars container */}
            <div className="flex items-end gap-1 h-[140px]">
              {/* Revenue bar */}
              <div
                className="w-5 rounded-t-[4px]"
                style={{
                  height: bar.value1,
                  background: "linear-gradient(to top, #FF5C00, #FF8A4C)",
                }}
              />
              {/* Expenses bar */}
              <div
                className="w-5 rounded-t-[4px] bg-[var(--border-muted)]"
                style={{ height: bar.value2 }}
              />
            </div>
            {/* Label */}
            <span
              className={`text-[11px] ${
                bar.isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-label)]"
              }`}
            >
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
