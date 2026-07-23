"use client";

import React, {
  createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode,
} from "react";
import { Trophy, X } from "lucide-react";

interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface AchievementToastContextType {
  showAchievements: (achievements: AchievementData[]) => void;
}

const AchievementToastContext = createContext<AchievementToastContextType | undefined>(undefined);

export function useAchievementToast() {
  const context = useContext(AchievementToastContext);
  if (!context) {
    throw new Error("useAchievementToast must be used within AchievementToastProvider");
  }
  return context;
}

const AUTO_DISMISS_MS = 5000;
const ENTER_MS = 300;
const EXIT_MS = 250;

type ToastPhase = "enter" | "visible" | "exit";
interface ActiveToast extends AchievementData {
  key: number;
  phase: ToastPhase;
  startedAt: number;
  paused: boolean;
  remaining: number;
}

let toastKeyCounter = 0;

// Inject shared keyframes once
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("op-toast-styles")) return;
  const el = document.createElement("style");
  el.id = "op-toast-styles";
  el.textContent = `
    @keyframes op-toast-in {
      0%   { transform: translateX(calc(100% + 32px)) scale(0.96); opacity: 0; }
      60%  { transform: translateX(-4px) scale(1.01); opacity: 1; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes op-toast-out {
      0%   { transform: translateX(0) scale(1); opacity: 1; max-height: 200px; margin-bottom: 12px; }
      100% { transform: translateX(calc(100% + 32px)) scale(0.94); opacity: 0; max-height: 0; margin-bottom: 0; }
    }
    @keyframes op-toast-progress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
    @keyframes op-icon-bounce {
      0%   { transform: scale(0.6) rotate(-10deg); opacity: 0; }
      50%  { transform: scale(1.15) rotate(6deg); }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

export function AchievementToastProvider({ children }: { children: ReactNode }) {
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

  const scheduleDismiss = useCallback((key: number, ms: number) => {
    const timer = timers.current[key];
    if (timer) clearTimeout(timer);
    timers.current[key] = setTimeout(() => dismiss(key), ms);
  }, [dismiss]);

  const showAchievements = useCallback((achievements: AchievementData[]) => {
    if (achievements.length === 0) return;
    const newToasts: ActiveToast[] = achievements.map((a) => ({
      ...a,
      key: ++toastKeyCounter,
      phase: "enter",
      startedAt: Date.now(),
      paused: false,
      remaining: AUTO_DISMISS_MS,
    }));
    setToasts(prev => [...prev, ...newToasts]);
    newToasts.forEach((t) => {
      // Promote to visible after the enter animation
      setTimeout(() => {
        setToasts(prev => prev.map(p => p.key === t.key ? { ...p, phase: "visible" } : p));
      }, ENTER_MS);
      scheduleDismiss(t.key, AUTO_DISMISS_MS + ENTER_MS);
    });
  }, [scheduleDismiss]);

  const handleMouseEnter = useCallback((key: number) => {
    const timer = timers.current[key];
    if (timer) clearTimeout(timer);
    delete timers.current[key];
    setToasts(prev => prev.map(t => {
      if (t.key !== key) return t;
      const elapsed = Date.now() - t.startedAt;
      return { ...t, paused: true, remaining: Math.max(0, AUTO_DISMISS_MS - elapsed) };
    }));
  }, []);

  const handleMouseLeave = useCallback((key: number) => {
    setToasts(prev => prev.map(t => {
      if (t.key !== key) return t;
      const remaining = t.remaining;
      timers.current[key] = setTimeout(() => dismiss(key), remaining);
      return { ...t, paused: false, startedAt: Date.now() - (AUTO_DISMISS_MS - remaining) };
    }));
  }, [dismiss]);

  return (
    <AchievementToastContext.Provider value={{ showAchievements }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          pointerEvents: "none",
          maxWidth: 380,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.key}
            onMouseEnter={() => handleMouseEnter(t.key)}
            onMouseLeave={() => handleMouseLeave(t.key)}
            style={{
              pointerEvents: "auto",
              animation:
                t.phase === "enter"  ? `op-toast-in ${ENTER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards` :
                t.phase === "exit"   ? `op-toast-out ${EXIT_MS}ms cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards` :
                                       undefined,
              width: 360,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "16px 18px",
                background: "color-mix(in oklab, var(--bg-card) 92%, transparent)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid var(--border-primary)",
                borderRadius: 14,
                boxShadow: `
                  0 12px 40px -8px rgba(0, 0, 0, 0.55),
                  0 2px 8px -2px rgba(0, 0, 0, 0.35),
                  inset 0 1px 0 rgba(255, 255, 255, 0.04)
                `,
                overflow: "hidden",
                fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {/* Accent gradient sliver on the left */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0, top: 0, bottom: 0, width: 3,
                  background: "linear-gradient(180deg, #FFD700 0%, var(--accent-primary) 100%)",
                }}
              />

              {/* Icon badge */}
              <div
                style={{
                  position: "relative",
                  flexShrink: 0,
                  width: 44, height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #FFD700 0%, var(--accent-primary) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px -2px rgba(255, 92, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                  animation: t.phase === "enter"
                    ? "op-icon-bounce 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both"
                    : undefined,
                }}
              >
                <Trophy size={20} color="#fff" strokeWidth={2.5} />
                {/* Subtle emoji indicator */}
                {t.icon && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: -4,
                      right: -4,
                      width: 20, height: 20,
                      borderRadius: 999,
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-primary)",
                      fontSize: 12,
                      lineHeight: "18px",
                      textAlign: "center",
                    }}
                  >
                    {t.icon}
                  </span>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent-primary)",
                    marginBottom: 3,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                  }}
                >
                  Achievement unlocked
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    lineHeight: 1.35,
                    marginBottom: 2,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.description}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => dismiss(t.key)}
                aria-label="Dismiss achievement notification"
                style={{
                  position: "absolute",
                  top: 10, right: 10,
                  width: 22, height: 22,
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
                <X size={12} />
              </button>

              {/* Progress bar */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0, right: 0, bottom: 0,
                  height: 2,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #FFD700, var(--accent-primary))",
                    transformOrigin: "left center",
                    animationName: t.phase === "visible" ? "op-toast-progress" : "none",
                    animationDuration: `${t.remaining}ms`,
                    animationTimingFunction: "linear",
                    animationFillMode: "forwards",
                    animationPlayState: t.paused ? "paused" : "running",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AchievementToastContext.Provider>
  );
}
