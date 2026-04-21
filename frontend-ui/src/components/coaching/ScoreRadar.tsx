"use client";

interface ScoreData {
  riskManagement: { score: number; reasons: string[] };
  timing: { score: number; reasons: string[] };
  discipline: { score: number; reasons: string[] };
  diversification: { score: number; reasons: string[] };
  performance: { score: number; reasons: string[] };
}

interface Props {
  scores: ScoreData;
  overall: number;
  grade: string;
}

const LABELS = [
  { key: "riskManagement", label: "Risk Mgmt", color: "#FF5C00" },
  { key: "timing", label: "Timing", color: "#22C55E" },
  { key: "discipline", label: "Discipline", color: "#3B82F6" },
  { key: "diversification", label: "Diversity", color: "#A855F7" },
  { key: "performance", label: "Performance", color: "#EAB308" },
];

export default function ScoreRadar({ scores, overall, grade }: Props) {
  const cx = 140;
  const cy = 130;
  const maxR = 100;
  const n = LABELS.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 100) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Score polygon
  const points = LABELS.map((l, i) => {
    const val = (scores as any)[l.key]?.score ?? 0;
    return getPoint(i, val);
  });
  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  // Grid rings
  const rings = [20, 40, 60, 80, 100];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Radar Chart */}
      <svg width={280} height={270} viewBox="0 0 280 270">
        {/* Grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={LABELS.map((_, i) => {
              const p = getPoint(i, r);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {LABELS.map((_, i) => {
          const p = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="var(--border-primary)"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Score polygon */}
        <polygon
          points={polygonPath.replace(/[MLZ]/g, (m) => (m === "Z" ? "" : "")).trim().replace(/L/g, " ")}
          fill="rgba(255, 92, 0, 0.15)"
          stroke="#FF5C00"
          strokeWidth={2}
        />

        {/* Score dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={LABELS[i].color}
            stroke="var(--bg-card)"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {LABELS.map((l, i) => {
          const p = getPoint(i, 120);
          const val = (scores as any)[l.key]?.score ?? 0;
          return (
            <g key={i}>
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-medium"
                fill="var(--text-muted)"
              >
                {l.label}
              </text>
              <text
                x={p.x}
                y={p.y + 13}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-mono font-bold"
                fill={l.color}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Center grade */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[28px] font-mono font-bold"
          fill="var(--accent-primary)"
        >
          {grade}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[11px] font-mono"
          fill="var(--text-muted)"
        >
          {overall}/100
        </text>
      </svg>

      {/* Score breakdown */}
      <div className="w-full space-y-2">
        {LABELS.map((l) => {
          const data = (scores as any)[l.key];
          const val = data?.score ?? 0;
          return (
            <div key={l.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  {l.label}
                </span>
                <span
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: l.color }}
                >
                  {val}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${val}%`, backgroundColor: l.color }}
                />
              </div>
              {data?.reasons?.length > 0 && (
                <div className="text-[10px] text-[var(--text-dim)] pl-1">
                  {data.reasons[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
