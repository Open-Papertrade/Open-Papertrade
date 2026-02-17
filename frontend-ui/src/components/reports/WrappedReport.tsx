/**
 * Yearly Wrapped - Trading Year report card.
 * Shareable 1080px single-column layout.
 * Pure inline styles + explicit lineHeight on all text for html2canvas.
 */

export interface WrappedReportProps {
  year: number;
  username: string;
  initials: string;
  avatarUrl?: string | null;
  memberSince: string;
  traderRank: string;
  totalTrades: number;
  totalProfit: string;
  totalProfitPositive: boolean;
  winRate: number;
  stocksTraded: number;
  bestTicker: string;
  bestTradeCount: number;
  bestProfit: string;
  bestReturn: string;
  dayStreak: number;
  volume: string;
  bestDay: string;
  onShare?: () => void;
}

const S = {
  inter: "Inter, sans-serif",
  mono: "'DM Mono', monospace",
  dark: "#0A0A0B",
  card: "#111113",
  muted: "#6B6B70",
  dimmed: "#4A4A50",
  accent: "#FF5C00",
  green: "#22C55E",
  red: "#EF4444",
  purple: "#8B5CF6",
  cardBg: "#1A1A1D",
  borderCard: "#2A2A2E",
} as const;

export default function WrappedReport({
  year, username, initials, avatarUrl, memberSince, traderRank,
  totalTrades, totalProfit, totalProfitPositive,
  winRate, stocksTraded, bestTicker, bestTradeCount, bestProfit, bestReturn,
  dayStreak, volume, bestDay, onShare,
}: WrappedReportProps) {
  return (
    <div style={{ position: "relative", overflow: "hidden", width: 1080, height: 1415, background: S.dark, fontFamily: S.mono }}>
      {/* Background glows - blurred */}
      <div style={{ position: "absolute", width: 900, height: 900, left: -250, top: -250, background: "radial-gradient(circle, #FF5C0050 0%, #FF5C0000 70%)", borderRadius: "50%", filter: "blur(120px)" }} />
      <div style={{ position: "absolute", width: 700, height: 700, left: 550, top: 850, background: "radial-gradient(circle, #8B5CF635 0%, #8B5CF600 70%)", borderRadius: "50%", filter: "blur(100px)" }} />
      <div style={{ position: "absolute", width: 500, height: 500, left: 300, top: 400, background: "radial-gradient(circle, #FF5C0018 0%, #FF5C0000 70%)", borderRadius: "50%", filter: "blur(80px)" }} />

      {/* Main content */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 40, padding: 56, width: 1080, height: 1350, boxSizing: "border-box" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", height: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 22 }}>
            <img src="/logo.png" alt="" width={22} height={22} style={{ display: "block" }} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 4, color: "white", lineHeight: "22px" }}>OPEN</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 4, color: S.accent, lineHeight: "22px" }}>PAPERTRADE</span>
          </div>
          <div style={{ borderRadius: 24, padding: "10px 20px", background: "linear-gradient(90deg, rgba(255,92,0,0.9) 0%, rgba(255,138,76,0.9) 100%)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "white", lineHeight: "14px" }}>{year} WRAPPED</span>
          </div>
        </div>

        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 180, height: 180, borderRadius: 90, background: "linear-gradient(135deg, #FF5C00 0%, #FF8A4C 50%, #8B5CF6 100%)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 168, height: 168, borderRadius: 84, background: "rgba(26,26,29,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", overflow: "hidden" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" width={168} height={168} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 56, fontWeight: 700, color: "white", lineHeight: "56px" }}>{initials}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "white", lineHeight: "32px" }}>@{username}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16, height: 18 }}>
              <span style={{ fontSize: 14, color: S.muted, fontFamily: S.inter, lineHeight: "18px" }}>Trading since {memberSince}</span>
              <div style={{ width: 4, height: 4, borderRadius: 2, background: "#3A3A40" }} />
              <span style={{ fontSize: 14, color: S.accent, fontFamily: S.inter, lineHeight: "18px" }}>{traderRank}</span>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
          <span style={{ fontSize: 48, color: "rgba(255,255,255,0.5)", lineHeight: "52px" }}>What a year,</span>
          <span style={{ fontSize: 72, fontWeight: 700, color: "white", letterSpacing: -2, lineHeight: "76px" }}>Trader.</span>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", paddingTop: 32, paddingBottom: 32 }}>
          <div style={{ display: "flex", gap: 16, width: "100%" }}>
            <StatCard value={String(totalTrades)} label="Total Trades" valueColor={S.accent} />
            <StatCard value={totalProfit} label="Total Profit" valueColor={totalProfitPositive ? S.green : S.red} />
          </div>
          <div style={{ display: "flex", gap: 16, width: "100%" }}>
            <StatCard value={`${winRate}%`} label="Win Rate" />
            <StatCard value={String(stocksTraded)} label="Stocks Traded" valueColor={S.purple} />
          </div>

          {/* Highlight */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%", borderRadius: 20, padding: 28, background: "linear-gradient(100deg, rgba(255,92,0,0.1) 0%, rgba(139,92,246,0.08) 100%)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,92,0,0.2)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <span style={{ fontSize: 11, letterSpacing: 3, color: S.accent, lineHeight: "14px" }}>BEST PERFORMER</span>
              <span style={{ fontSize: 40, fontWeight: 700, color: "white", lineHeight: "44px" }}>{bestTicker}</span>
              <span style={{ fontSize: 13, color: S.muted, fontFamily: S.inter, lineHeight: "16px" }}>{bestTradeCount} trades &middot; {bestProfit} profit</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: S.green, lineHeight: "36px" }}>{bestReturn}</span>
              <span style={{ fontSize: 12, color: S.muted, fontFamily: S.inter, lineHeight: "16px" }}>annual return</span>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <MiniStat value={String(dayStreak)} label="Day Streak" />
            <MiniStat value={volume} label="Volume" />
            <MiniStat value={bestDay} label="Best Day" valueColor={S.accent} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>
          <button onClick={onShare} style={{ display: "block", borderRadius: 30, padding: "14px 24px", background: "linear-gradient(90deg, #FF5C00 0%, #FF8A4C 100%)", border: "none", cursor: "pointer" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "white", lineHeight: "18px" }}>Share Your Wrapped</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 16 }}>
            <span style={{ fontSize: 13, color: S.accent, lineHeight: "16px" }}>#OpenPaperTrade</span>
            <div style={{ width: 4, height: 4, borderRadius: 2, background: "#3A3A40" }} />
            <span style={{ fontSize: 13, color: S.purple, lineHeight: "16px" }}>#{year}Wrapped</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 14 }}>
            <img src="/logo.png" alt="" width={14} height={14} style={{ display: "block" }} />
            <span style={{ fontSize: 12, color: S.dimmed, fontFamily: S.inter, lineHeight: "14px" }}>Open Papertrade</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, valueColor = "white" }: { value: string; label: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, borderRadius: 20, padding: 28, background: "rgba(26,26,29,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)", boxSizing: "border-box" }}>
      <span style={{ fontSize: 52, fontWeight: 700, color: valueColor, lineHeight: "56px" }}>{value}</span>
      <span style={{ fontSize: 14, color: S.muted, fontFamily: S.inter, lineHeight: "18px" }}>{label}</span>
    </div>
  );
}

function MiniStat({ value, label, valueColor = "white" }: { value: string; label: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, borderRadius: 12, background: "rgba(17,17,19,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.04)", padding: "16px 20px", boxSizing: "border-box" }}>
      <span style={{ fontSize: 24, fontWeight: 700, color: valueColor, lineHeight: "28px" }}>{value}</span>
      <span style={{ fontSize: 11, color: S.muted, fontFamily: S.inter, lineHeight: "14px" }}>{label}</span>
    </div>
  );
}
