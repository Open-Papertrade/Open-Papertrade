"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

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

// Inject CSS keyframes once
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("xp-toast-styles")) return;

  const style = document.createElement("style");
  style.id = "xp-toast-styles";
  style.textContent = `
    @keyframes xpSlideIn {
      0% { transform: translateX(calc(100% + 32px)); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes xpSlideOut {
      0% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(calc(100% + 32px)); opacity: 0; }
    }
    @keyframes xpBounce {
      0% { transform: scale(0.5); opacity: 0; }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes xpGlow {
      0% { box-shadow: 0 4px 16px rgba(255, 92, 0, 0.1); }
      40% { box-shadow: 0 4px 32px rgba(255, 92, 0, 0.4), 0 0 60px rgba(255, 170, 0, 0.2); }
      100% { box-shadow: 0 4px 16px rgba(255, 92, 0, 0.15); }
    }
    @keyframes xpShimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes xpParticle {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes rankUpPulse {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Particle positions (8 particles bursting outward)
const PARTICLES = [
  { x: -24, y: -20 },
  { x: 24, y: -20 },
  { x: -30, y: 0 },
  { x: 30, y: 0 },
  { x: -24, y: 20 },
  { x: 24, y: 20 },
  { x: 0, y: -28 },
  { x: 0, y: 28 },
];

export function XpToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<XpToastData[]>([]);
  const [current, setCurrent] = useState<XpToastData | null>(null);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit" | "idle">("idle");
  const stylesInjected = useRef(false);

  // Inject styles on mount
  useEffect(() => {
    if (!stylesInjected.current) {
      injectStyles();
      stylesInjected.current = true;
    }
  }, []);

  const showXpGain = useCallback((amount: number, newLevel?: number, newRank?: string) => {
    if (amount <= 0) return;
    setQueue(prev => [...prev, { amount, newLevel, newRank }]);
  }, []);

  // Show next from queue
  useEffect(() => {
    if (current || queue.length === 0) return;

    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrent(next);
    setPhase("enter");

    // Transition to visible after slide-in
    const t1 = setTimeout(() => setPhase("visible"), 400);

    // Start exit after 2.5s
    const t2 = setTimeout(() => setPhase("exit"), 2500);

    // Clear from DOM after exit animation
    const t3 = setTimeout(() => {
      setCurrent(null);
      setPhase("idle");
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [queue, current]);

  const isRankUp = current?.newRank != null;

  return (
    <XpToastContext.Provider value={{ showXpGain }}>
      {children}
      {current && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 24,
            zIndex: 9998,
            animation: phase === "enter"
              ? "xpSlideIn 0.4s ease-out forwards"
              : phase === "exit"
                ? "xpSlideOut 0.3s ease-in forwards"
                : "none",
            transform: phase === "visible" ? "translateX(0)" : undefined,
            opacity: phase === "visible" ? 1 : undefined,
            pointerEvents: "none",
          }}
        >
          {/* Particle burst */}
          {(phase === "enter" || phase === "visible") && PARTICLES.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isRankUp
                  ? `hsl(${40 + i * 10}, 100%, ${60 + i * 3}%)`
                  : `hsl(${20 + i * 5}, 100%, ${55 + i * 3}%)`,
                animation: "xpParticle 0.8s ease-out forwards",
                animationDelay: `${0.05 * i}s`,
                // Use CSS custom property for the translate endpoint
                transform: `translate(${p.x}px, ${p.y}px) scale(0)`,
                opacity: 0,
                // Override animation with specific keyframes per particle
                animationName: "none",
              }}
            >
              <style>{`
                @keyframes xpParticle${i} {
                  0% { transform: translate(0, 0) scale(1); opacity: 1; }
                  100% { transform: translate(${p.x}px, ${p.y}px) scale(0); opacity: 0; }
                }
              `}</style>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "inherit",
                  animation: `xpParticle${i} 0.8s ease-out forwards`,
                  animationDelay: `${0.05 * i}s`,
                }}
              />
            </div>
          ))}

          {/* Toast pill */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: isRankUp ? "12px 20px" : "10px 18px",
              background: isRankUp
                ? "linear-gradient(135deg, rgba(30, 25, 15, 0.98), rgba(40, 30, 10, 0.98))"
                : "linear-gradient(135deg, rgba(20, 18, 16, 0.98), rgba(30, 24, 18, 0.98))",
              border: isRankUp
                ? "1px solid rgba(255, 200, 50, 0.6)"
                : "1px solid rgba(255, 92, 0, 0.5)",
              borderRadius: 14,
              animation: phase === "visible"
                ? "xpGlow 1s ease-in-out"
                : "none",
              backgroundImage: phase === "visible"
                ? "linear-gradient(90deg, transparent 0%, rgba(255, 170, 50, 0.08) 50%, transparent 100%)"
                : undefined,
              backgroundSize: "200% 100%",
              minWidth: 120,
              ...(phase === "visible" ? {
                animationName: "xpGlow, xpShimmer",
                animationDuration: "1s, 1.5s",
                animationTimingFunction: "ease-in-out, linear",
                animationFillMode: "forwards, forwards",
              } : {}),
            }}
          >
            {/* XP line */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Zap icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isRankUp ? "#FFD700" : "#FF5C00"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: isRankUp
                    ? "drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))"
                    : "drop-shadow(0 0 4px rgba(255, 92, 0, 0.5))",
                }}
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>

              {/* XP amount */}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 18,
                  fontWeight: 600,
                  color: isRankUp ? "#FFD700" : "#FF5C00",
                  textShadow: isRankUp
                    ? "0 0 12px rgba(255, 215, 0, 0.5)"
                    : "0 0 8px rgba(255, 92, 0, 0.4)",
                  animation: phase === "enter"
                    ? "xpBounce 0.5s ease-out forwards"
                    : "none",
                  animationDelay: "0.1s",
                  opacity: phase === "enter" ? 0 : 1,
                  animationFillMode: "forwards",
                }}
              >
                +{current.amount} XP
              </span>
            </div>

            {/* Rank up line */}
            {isRankUp && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#FFD700",
                  textShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
                  animation: "rankUpPulse 0.6s ease-out forwards",
                  animationDelay: "0.3s",
                  opacity: 0,
                  animationFillMode: "forwards",
                  marginTop: 2,
                }}
              >
                RANK UP! &rarr; {current.newRank}
              </div>
            )}
          </div>
        </div>
      )}
    </XpToastContext.Provider>
  );
}
