"use client";

import React, {
  createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode,
} from "react";
import { Zap, TrendingUp, X } from "lucide-react";

interface XpToastData {
  amount: number;
  newLevel?: number;
  newRank?: string;
}

interface XpToastContextType {
  showXpGain: (amount: number, newLevel?: number, newRank?: string) => void;
}

const XpToastContext = createContext<XpToastContextType | undefined>(undefined);

export function useXpToast() {
  const context = useContext(XpToastContext);
  if (!context) {
    throw new Error("useXpToast must be used within XpToastProvider");
  }
  return context;
}

const AUTO_DISMISS_MS = 3500;
const AUTO_DISMISS_MS_RANK_UP = 5000;
const ENTER_MS = 320;
const EXIT_MS = 240;

type ToastPhase = "enter" | "visible" | "exit";
interface ActiveToast extends XpToastData {
  key: number;
  phase: ToastPhase;
  startedAt: number;
  paused: boolean;
  remaining: number;
}

let toastKeyCounter = 0;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("op-xp-styles")) return;
  const el = document.createElement("style");
  el.id = "op-xp-styles";
  el.textContent = `
    @keyframes op-xp-in {
      0%   { transform: translateX(calc(100% + 32px)) scale(0.94); opacity: 0; }
      60%  { transform: translateX(-3px) scale(1.02); opacity: 1; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes op-xp-out {
      0%   { transform: translateX(0) scale(1); opacity: 1; max-height: 200px; margin-bottom: 12px; }
      100% { transform: translateX(calc(100% + 32px)) scale(0.94); opacity: 0; max-height: 0; margin-bottom: 0; }
    }
    @keyframes op-xp-progress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
    @keyframes op-xp-badge-bounce {
      0%   { transform: scale(0.5); opacity: 0; }
      55%  { transform: scale(1.18); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes op-xp-halo {
      0%   { transform: scale(0.6); opacity: 0.6; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    @keyframes op-xp-count-up {
      0%   { transform: translateY(6px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes op-xp-rankup-slide {
      0%   { transform: translateY(-4px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

export function XpToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { ensureStyles(); }, []);

  const dismiss = useCallback((key: number) => {
    setToasts(prev => prev.map(t => t.key === key ? { ...t, phase: "exit" } : t));
    const timer = timers.current[key];
    if (timer) clearTimeout(timer);
    delete timers.current[key];
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.key !== key));
    }, EXIT_MS);
  }, []);

  const showXpGain = useCallback((amount: number, newLevel?: number, newRank?: string) => {
    if (amount <= 0) return;
    const key = ++toastKeyCounter;
    const dismissMs = newRank ? AUTO_DISMISS_MS_RANK_UP : AUTO_DISMISS_MS;

    setToasts(prev => [...prev, {
      key,
      amount,
      newLevel,
      newRank,
      phase: "enter",
      startedAt: Date.now(),
      paused: false,
      remaining: dismissMs,
    }]);

    setTimeout(() => {
      setToasts(prev => prev.map(p => p.key === key ? { ...p, phase: "visible" } : p));
    }, ENTER_MS);
    timers.current[key] = setTimeout(() => dismiss(key), dismissMs + ENTER_MS);
  }, [dismiss]);

  const handleMouseEnter = useCallback((key: number) => {
    const timer = timers.current[key];
    if (timer) clearTimeout(timer);
    delete timers.current[key];
    setToasts(prev => prev.map(t => {
      if (t.key !== key) return t;
      const total = t.newRank ? AUTO_DISMISS_MS_RANK_UP : AUTO_DISMISS_MS;
      const elapsed = Date.now() - t.startedAt;
      return { ...t, paused: true, remaining: Math.max(0, total - elapsed) };
    }));
  }, []);

  const handleMouseLeave = useCallback((key: number) => {
    setToasts(prev => prev.map(t => {
      if (t.key !== key) return t;
      const total = t.newRank ? AUTO_DISMISS_MS_RANK_UP : AUTO_DISMISS_MS;
      timers.current[key] = setTimeout(() => dismiss(key), t.remaining);
      return { ...t, paused: false, startedAt: Date.now() - (total - t.remaining) };
    }));
  }, [dismiss]);

  return (
    <XpToastContext.Provider value={{ showXpGain }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9998,
          display: "flex",
          flexDirection: "column-reverse",  // newest at bottom, older stacks upward
          gap: 12,
          pointerEvents: "none",
          maxWidth: 340,
        }}
      >
        {toasts.map((t) => {
          const isRankUp = t.newRank != null;
          const accent = isRankUp ? "#FFD700" : "var(--accent-primary)";
          const accent2 = isRankUp ? "#FFA200" : "var(--accent-secondary)";

          return (
            <div
              key={t.key}
              onMouseEnter={() => handleMouseEnter(t.key)}
              onMouseLeave={() => handleMouseLeave(t.key)}
              style={{
                pointerEvents: "auto",
                width: isRankUp ? 320 : 260,
                animation:
                  t.phase === "enter" ? `op-xp-in ${ENTER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards` :
                  t.phase === "exit"  ? `op-xp-out ${EXIT_MS}ms cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards` :
                                        undefined,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: isRankUp ? "14px 16px" : "12px 14px",
                  background: "color-mix(in oklab, var(--bg-card) 92%, transparent)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: `1px solid ${isRankUp ? "rgba(255, 215, 0, 0.4)" : "var(--border-primary)"}`,
                  borderRadius: 14,
                  boxShadow: isRankUp
                    ? "0 12px 40px -8px rgba(255, 215, 0, 0.25), 0 2px 8px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
                    : "0 12px 40px -8px rgba(255, 92, 0, 0.2), 0 2px 8px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  overflow: "hidden",
                  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {/* Icon badge with halo */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {t.phase === "enter" && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: -6,
                        borderRadius: 999,
                        background: `radial-gradient(circle, ${isRankUp ? "rgba(255, 215, 0, 0.6)" : "rgba(255, 92, 0, 0.5)"} 0%, transparent 70%)`,
                        animation: "op-xp-halo 700ms ease-out forwards",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "relative",
                      width: 40, height: 40,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${accent} 0%, ${accent2} 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isRankUp
                        ? "0 4px 14px -2px rgba(255, 215, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                        : "0 4px 12px -2px rgba(255, 92, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                      animation: t.phase === "enter"
                        ? "op-xp-badge-bounce 460ms cubic-bezier(0.34, 1.56, 0.64, 1) 60ms both"
                        : undefined,
                    }}
                  >
                    {isRankUp
                      ? <TrendingUp size={18} color="#fff" strokeWidth={2.75} />
                      : <Zap size={18} color="#fff" strokeWidth={2.75} fill="#fff" />}
                  </div>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 18 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: accent,
                      fontFamily: "'DM Mono', ui-monospace, monospace",
                      marginBottom: 2,
                    }}
                  >
                    {isRankUp ? "Rank up" : "XP gained"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 6,
                      animation: t.phase === "enter"
                        ? "op-xp-count-up 400ms ease-out 120ms both"
                        : undefined,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', ui-monospace, monospace",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        lineHeight: 1.1,
                      }}
                    >
                      +{t.amount}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', ui-monospace, monospace",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      XP
                    </span>
                  </div>
                  {isRankUp && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 4,
                        animation: "op-xp-rankup-slide 350ms ease-out 250ms both",
                      }}
                    >
                      Now{" "}
                      <span style={{ color: accent, fontWeight: 600 }}>
                        Lv.{t.newLevel} {t.newRank}
                      </span>
                    </div>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => dismiss(t.key)}
                  aria-label="Dismiss XP notification"
                  style={{
                    position: "absolute",
                    top: 8, right: 8,
                    width: 20, height: 20,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 150ms, color 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  <X size={11} />
                </button>

                {/* Progress bar */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0, right: 0, bottom: 0,
                    height: 2,
                    background: "rgba(255, 255, 255, 0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: `linear-gradient(90deg, ${accent}, ${accent2})`,
                      transformOrigin: "left center",
                      animationName: t.phase === "visible" ? "op-xp-progress" : "none",
                      animationDuration: `${t.remaining}ms`,
                      animationTimingFunction: "linear",
                      animationFillMode: "forwards",
                      animationPlayState: t.paused ? "paused" : "running",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </XpToastContext.Provider>
  );
}
