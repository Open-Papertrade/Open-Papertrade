/**
 * Monthly Report - Shareable card.
 * Two-panel layout (orange left + dark right), 1080x1080.
 * Pure inline styles + explicit lineHeight on all text for html2canvas.
 */

export interface WeekBar {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface MonthlyReportProps {
  month: string;
  username: string;
  initials?: string;
  avatarUrl?: string | null;
  memberSince: string;
  totalTrades: number;
  uniqueStocks: number;
  totalPL: string;
  totalPLPositive: boolean;
  volume: string;
  bestTicker: string;
  bestName: string;
  bestProfit: string;
  bestPercent: string;
  winRate: number;
  streak: string;
  streakPositive: boolean;
  stocks: number;
  growthPercent: string;
  growthPositive: boolean;
  weekBars: WeekBar[];
  onShare?: () => void;
}

const S = {
  inter: "Inter, sans-serif",
  mono: "'DM Mono', monospace",
  dark: "#0A0A0B",
  card: "#111113",
  cardBorder: "1px solid #1F1F23",
  muted: "#6B6B70",
  dimmed: "#4A4A50",
  accent: "#FF5C00",
  green: "#22C55E",
  red: "#EF4444",
  cardBg: "#1A1A1D",
  hoverBg: "#252528",
  borderCard: "#2A2A2E",
} as const;

export default function MonthlyReport({
  month, username, initials, avatarUrl, memberSince, totalTrades, uniqueStocks,
  totalPL, totalPLPositive, volume, bestTicker, bestName, bestProfit, bestPercent,
  winRate, streak, streakPositive, stocks, growthPercent, growthPositive,
  weekBars, onShare,
}: MonthlyReportProps) {
  const maxBar = Math.max(...weekBars.map((b) => Math.abs(b.value)), 1);

  return (
    <div style={{ display: "flex", width: 1080, height: 1080, fontFamily: S.mono }}>
      {/* Left panel */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexShrink: 0, width: 480, height: "100%", background: "linear-gradient(160deg, #FF5C00 0%, #FF8A4C 50%, #FFB347 100%)", padding: 48, boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 20 }}>
            <img src="/logo.png" alt="" width={20} height={20} style={{ display: "block" }} />
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 3, color: S.dark, lineHeight: "20px" }}>OPEN</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, color: S.dark, lineHeight: "20px" }}>PAPERTRADE</span>
          </div>
          <div style={{ display: "inline-block", alignSelf: "flex-start", borderRadius: 20, padding: "8px 16px", background: "#0A0A0B20" }}>
            <span style={{ fontSize: 11, letterSpacing: 3, color: S.dark, lineHeight: "14px" }}>{month.toUpperCase()}</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: S.dark, lineHeight: "68px", letterSpacing: -2 }}>
            Month<br />In<br />Review
          </div>
          <p style={{ fontSize: 14, color: "#0A0A0BAA", lineHeight: "22px", maxWidth: 320, margin: 0 }}>
            You crushed it this month with {totalTrades} trades across {uniqueStocks} different stocks.
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {avatarUrl ? (
            <div style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", flexShrink: 0, border: "2px solid #0A0A0B20", boxSizing: "border-box" }}>
              <img src={avatarUrl} alt="" width={40} height={40} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : initials ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 20, background: S.dark, flexShrink: 0, border: "2px solid #0A0A0B20", boxSizing: "border-box" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: S.accent }}>{initials}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: S.dark, lineHeight: "22px" }}>@{username}</span>
            <span style={{ fontSize: 12, color: "#0A0A0B80", lineHeight: "16px" }}>Trading since {memberSince}</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, background: S.dark, padding: 48, boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 40 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: S.muted, lineHeight: "40px" }}>YOUR NUMBERS</span>
          <button onClick={onShare} style={{ display: "block", borderRadius: 6, background: S.cardBg, padding: "10px 16px", border: "none", cursor: "pointer" }}>
            <span style={{ fontSize: 12, color: "white", fontWeight: 500, fontFamily: S.inter, lineHeight: "16px" }}>Share</span>
          </button>
        </div>

        {/* Stats row 1 */}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>TOTAL P&amp;L</span>
            <span style={{ fontSize: 32, fontWeight: 700, color: totalPLPositive ? S.green : S.red, lineHeight: "36px" }}>{totalPL}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>VOLUME</span>
            <span style={{ fontSize: 32, fontWeight: 700, color: "white", lineHeight: "36px" }}>{volume}</span>
          </div>
        </div>

        {/* Best performer */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%", borderRadius: 12, padding: 24, background: `linear-gradient(135deg, ${S.cardBg} 0%, ${S.hoverBg} 100%)`, border: `1px solid ${S.borderCard}`, boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>BEST PERFORMER</span>
            <span style={{ fontSize: 40, fontWeight: 700, color: "white", lineHeight: "44px" }}>{bestTicker}</span>
            <span style={{ fontSize: 13, color: S.muted, fontFamily: S.inter, lineHeight: "16px" }}>{bestName}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: S.green, lineHeight: "28px" }}>{bestProfit}</span>
            <span style={{ fontSize: 14, color: S.green, fontFamily: S.inter, lineHeight: "18px" }}>{bestPercent}</span>
          </div>
        </div>

        {/* Stats row 2 */}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <MiniCard label="WIN RATE" value={`${winRate}%`} />
          <MiniCard label="STREAK" value={streak} valueColor={streakPositive ? S.accent : "white"} />
          <MiniCard label="STOCKS" value={String(stocks)} />
        </div>

        {/* Growth chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, width: "100%", borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 16 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "16px" }}>MONTHLY GROWTH</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: growthPositive ? S.green : S.red, lineHeight: "16px" }}>{growthPercent}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: 1, width: "100%" }}>
            {weekBars.map((bar, i) => {
              const pct = (Math.abs(bar.value) / maxBar) * 100;
              const bg = bar.value < 0 ? S.red : bar.highlight ? S.accent : "#2A2A2E";
              return <div key={i} style={{ flex: 1, height: `${Math.max(pct, 5)}%`, background: bg, borderRadius: "4px 4px 0 0" }} />;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            {weekBars.map((bar, i) => (
              <span key={i} style={{ fontSize: 10, color: S.dimmed, lineHeight: "12px" }}>{bar.label}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14 }}>
            <img src="/logo.png" alt="" width={14} height={14} style={{ display: "block" }} />
            <span style={{ fontSize: 12, color: S.muted, fontFamily: S.inter, lineHeight: "14px" }}>Open Papertrade</span>
          </div>
          <span style={{ fontSize: 11, color: S.accent, lineHeight: "14px" }}>#OpenPaperTrade</span>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, valueColor = "white" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
      <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: "32px" }}>{value}</span>
    </div>
  );
}
