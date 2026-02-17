/**
 * Weekly Report - Shareable card.
 * Two-panel layout (orange left + dark right), 1080x1080.
 * Pure inline styles + explicit lineHeight on all text for html2canvas.
 */

export interface DailyBar {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface WeeklyReportProps {
  dateRange: string;
  username: string;
  initials: string;
  avatarUrl?: string | null;
  memberSince: string;
  rank: string;
  totalReturn: string;
  totalReturnPositive: boolean;
  returnChange: string;
  winRate: number;
  winRateDetail: string;
  bestTicker: string;
  bestName: string;
  bestProfit: string;
  bestPercent: string;
  trades: number;
  volume: string;
  streak: string;
  streakPositive: boolean;
  dailyBars: DailyBar[];
  dailyChangePercent: string;
  generatedDate: string;
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
  purple: "#8B5CF6",
  cardBg: "#1A1A1D",
  hoverBg: "#252528",
  borderCard: "#2A2A2E",
} as const;

export default function WeeklyReport({
  dateRange, username, initials, avatarUrl, memberSince, rank,
  totalReturn, totalReturnPositive, returnChange,
  winRate, winRateDetail, bestTicker, bestName, bestProfit, bestPercent,
  trades, volume, streak, streakPositive,
  dailyBars, dailyChangePercent, generatedDate, onShare,
}: WeeklyReportProps) {
  const maxBar = Math.max(...dailyBars.map((b) => Math.abs(b.value)), 1);

  return (
    <div style={{ display: "flex", width: 1080, height: 1080, background: `linear-gradient(145deg, ${S.dark} 0%, ${S.cardBg} 100%)`, fontFamily: S.mono }}>
      {/* Left panel */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexShrink: 0, width: 460, height: "100%", background: "linear-gradient(180deg, #FF5C00 0%, #FF7A33 60%, #FFB347 100%)", padding: 48, boxSizing: "border-box" }}>
        {/* Top */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 20 }}>
            <img src="/logo.png" alt="" width={20} height={20} style={{ display: "block" }} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, color: S.dark, lineHeight: "20px" }}>OPEN</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: S.dark, lineHeight: "20px" }}>PAPERTRADE</span>
          </div>
          <div style={{ display: "inline-block", alignSelf: "flex-start", borderRadius: 20, padding: "8px 16px", background: "#0A0A0B20" }}>
            <span style={{ fontSize: 11, letterSpacing: 2, color: S.dark, lineHeight: "14px" }}>{dateRange}</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: S.dark, lineHeight: "66px", letterSpacing: -3 }}>
            Your<br />Weekly<br />Wins.
          </div>
          <p style={{ fontSize: 14, color: "#0A0A0BAA", lineHeight: "22px", maxWidth: 320, margin: 0 }}>
            Another week of smart trading decisions and portfolio growth.
          </p>
        </div>

        {/* User card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, borderRadius: 16, padding: 20, background: "#0A0A0B15" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 64, height: 64, borderRadius: 32, background: S.dark, border: "3px solid #0A0A0B30", boxSizing: "border-box", overflow: "hidden" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" width={64} height={64} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 22, fontWeight: 700, color: S.accent, lineHeight: "22px" }}>{initials}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: S.dark, lineHeight: "22px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{username}</span>
              <span style={{ fontSize: 12, color: "#0A0A0B80", fontFamily: S.inter, lineHeight: "16px" }}>Paper Trader since {memberSince}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: S.dark, lineHeight: "18px" }}>{rank}</span>
              <span style={{ fontSize: 11, color: "#0A0A0B60", fontFamily: S.inter, lineHeight: "14px" }}>this week</span>
            </div>
          </div>
          <span style={{ fontSize: 12, letterSpacing: 1, color: "#0A0A0B80", lineHeight: "16px" }}>#OpenPaperTrade</span>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, background: S.dark, padding: 48, boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 40 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: S.muted, lineHeight: "40px" }}>THIS WEEK&apos;S NUMBERS</span>
          <button onClick={onShare} style={{ display: "block", borderRadius: 8, background: S.cardBg, padding: "10px 16px", border: "none", cursor: "pointer" }}>
            <span style={{ fontSize: 12, color: "white", fontWeight: 500, fontFamily: S.inter, lineHeight: "16px" }}>Share</span>
          </button>
        </div>

        {/* Stats row 1 */}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <RightStatCard label="TOTAL RETURN" value={totalReturn} valueColor={totalReturnPositive ? S.green : S.red} detail={returnChange} detailColor={S.muted} />
          <RightStatCard label="WIN RATE" value={`${winRate}%`} detail={winRateDetail} detailIcon="target" />
        </div>

        {/* Best trade */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%", borderRadius: 12, padding: 24, background: `linear-gradient(135deg, ${S.cardBg} 0%, ${S.hoverBg} 100%)`, border: `1px solid ${S.borderCard}`, boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>BEST TRADE THIS WEEK</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: "white", lineHeight: "40px" }}>{bestTicker}</span>
            <span style={{ fontSize: 12, color: S.muted, fontFamily: S.inter, lineHeight: "16px" }}>{bestName}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: S.green, lineHeight: "28px" }}>{bestProfit}</span>
            <span style={{ fontSize: 13, color: S.green, fontFamily: S.inter, lineHeight: "16px" }}>{bestPercent}</span>
          </div>
        </div>

        {/* Stats row 2 */}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <SmallStat label="TRADES" value={String(trades)} valueColor={S.accent} />
          <SmallStat label="VOLUME" value={volume} />
          <SmallStat label="STREAK" value={streak} valueColor={streakPositive ? S.green : "white"} />
        </div>

        {/* Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, width: "100%", borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 16 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "16px" }}>DAILY PERFORMANCE</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.green, lineHeight: "16px" }}>{dailyChangePercent}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: 1, width: "100%" }}>
            {dailyBars.map((bar, i) => {
              const pct = (Math.abs(bar.value) / maxBar) * 100;
              const bg = bar.value < 0 ? S.red : bar.highlight ? S.accent : "#2A2A2E";
              return <div key={i} style={{ flex: 1, height: `${Math.max(pct, 5)}%`, background: bg, borderRadius: "4px 4px 0 0" }} />;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            {dailyBars.map((bar, i) => (
              <span key={i} style={{ fontSize: 10, color: S.dimmed, lineHeight: "12px" }}>{bar.label}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14 }}>
            <img src="/logo.png" alt="" width={14} height={14} style={{ display: "block" }} />
            <span style={{ fontSize: 11, color: S.dimmed, fontFamily: S.inter, lineHeight: "14px" }}>Open Papertrade</span>
          </div>
          <span style={{ fontSize: 11, color: S.dimmed, fontFamily: S.inter, lineHeight: "14px" }}>Generated {generatedDate}</span>
        </div>
      </div>
    </div>
  );
}

function RightStatCard({ label, value, valueColor = "white", detail, detailColor = "#6B6B70", detailIcon }: {
  label: string; value: string; valueColor?: string; detail: string; detailColor?: string; detailIcon?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
      <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 700, color: valueColor, lineHeight: "36px" }}>{value}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14 }}>
        {detailIcon === "target" && <span style={{ color: S.purple, fontSize: 14, lineHeight: "14px" }}>&#x25CE;</span>}
        <span style={{ fontSize: 11, color: detailColor, fontFamily: S.inter, lineHeight: "14px" }}>{detail}</span>
      </div>
    </div>
  );
}

function SmallStat({ label, value, valueColor = "white" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, borderRadius: 12, background: S.card, padding: 24, border: S.cardBorder, boxSizing: "border-box" }}>
      <span style={{ fontSize: 10, letterSpacing: 2, color: S.muted, lineHeight: "12px" }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: "32px" }}>{value}</span>
    </div>
  );
}
