"use client";

import React, {
  createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;   // ms; 0 = sticky (no auto-dismiss)
  icon?: ReactNode;    // override the default icon
}

interface ToastContextType {
  showToast: (opts: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const DEFAULT_DURATION = 4200;
const ENTER_MS = 300;
const EXIT_MS = 240;

type Phase = "enter" | "visible" | "exit";
interface ActiveToast extends Required<Omit<ToastOptions, "icon">> {
  key: number;
  phase: Phase;
  startedAt: number;
  paused: boolean;
  remaining: number;
  icon?: ReactNode;
}

let toastKeyCounter = 0;

// Variant → design tokens
const VARIANT_META: Record<
  ToastVariant,
  { accent: string; accent2: string; bg: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }
> = {
  success: {
    accent: "#22C55E",
    accent2: "#16A34A",
    bg: "rgba(34, 197, 94, 0.08)",
    icon: CheckCircle2,
  },
  error: {
    accent: "#EF4444",
    accent2: "#DC2626",
    bg: "rgba(239, 68, 68, 0.08)",
    icon: AlertCircle,
  },
  info: {
    accent: "#3B82F6",
    accent2: "#2563EB",
    bg: "rgba(59, 130, 246, 0.08)",
    icon: Info,
  },
  warning: {
    accent: "#F59E0B",
    accent2: "#D97706",
    bg: "rgba(245, 158, 11, 0.08)",
    icon: AlertTriangle,
  },
};

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("op-alert-styles")) return;
  const el = document.createElement("style");
  el.id = "op-alert-styles";
  el.textContent = `
    @keyframes op-alert-in {
      0%   { transform: translateX(calc(-100% - 32px)) scale(0.94); opacity: 0; }
      60%  { transform: translateX(4px) scale(1.01); opacity: 1; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes op-alert-out {
      0%   { transform: translateX(0) scale(1); opacity: 1; max-height: 200px; margin-top: 12px; }
      100% { transform: translateX(calc(-100% - 32px)) scale(0.94); opacity: 0; max-height: 0; margin-top: 0; }
    }
    @keyframes op-alert-progress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
    @keyframes op-alert-icon-in {
      0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
      55%  { transform: scale(1.15) rotate(5deg); }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { ensureStyles(); }, []);

  const dismiss = useCallback((key: number) => {
    setToasts(prev => prev.map(t => t.key === key ? { ...t, phase: "exit" } : t));
    const timer = timers.current[key];
    if (timer) clearTimeout(timer);
    delete timers.current[key];
    setTimeout(() => setToasts(prev => prev.filter(t => t.key !== key)), EXIT_MS);
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    const key = ++toastKeyCounter;
    const duration = opts.duration ?? DEFAULT_DURATION;
    const toast: ActiveToast = {
      key,
      variant: opts.variant ?? "info",
      title: opts.title,
      description: opts.description ?? "",
      duration,
      icon: opts.icon,
      phase: "enter",
      startedAt: Date.now(),
      paused: false,
      remaining: duration,
    };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.map(p => p.key === key ? { ...p, phase: "visible" } : p));
    }, ENTER_MS);
    if (duration > 0) {
      timers.current[key] = setTimeout(() => dismiss(key), duration + ENTER_MS);
    }
  }, [dismiss]);

  const success = useCallback((title: string, description?: string) => {
    showToast({ variant: "success", title, description });
  }, [showToast]);
  const error = useCallback((title: string, description?: string) => {
    showToast({ variant: "error", title, description, duration: 6000 });
  }, [showToast]);
  const info = useCallback((title: string, description?: string) => {
    showToast({ variant: "info", title, description });
  }, [showToast]);
  const warning = useCallback((title: string, description?: string) => {
    showToast({ variant: "warning", title, description });
  }, [showToast]);

  const handleMouseEnter = useCallback((key: number) => {
    const timer = timers.current[key];
    if (timer) clearTimeout(timer);
    delete timers.current[key];
    setToasts(prev => prev.map(t => {
      if (t.key !== key) return t;
      const elapsed = Date.now() - t.startedAt;
      return { ...t, paused: true, remaining: Math.max(0, t.duration - elapsed) };
    }));
  }, []);

  const handleMouseLeave = useCallback((key: number) => {
    setToasts(prev => prev.map(t => {
      if (t.key !== key) return t;
      if (t.duration === 0) return t;
      timers.current[key] = setTimeout(() => dismiss(key), t.remaining);
      return { ...t, paused: false, startedAt: Date.now() - (t.duration - t.remaining) };
    }));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          zIndex: 9997,
          display: "flex",
          flexDirection: "column-reverse", // newest at bottom, older stacks upward
          gap: 12,
          pointerEvents: "none",
          maxWidth: 400,
        }}
      >
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant];
          const IconComp = meta.icon;
          return (
            <div
              key={t.key}
              onMouseEnter={() => handleMouseEnter(t.key)}
              onMouseLeave={() => handleMouseLeave(t.key)}
              style={{
                pointerEvents: "auto",
                width: 380,
                animation:
                  t.phase === "enter" ? `op-alert-in ${ENTER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards` :
                  t.phase === "exit"  ? `op-alert-out ${EXIT_MS}ms cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards` :
                                        undefined,
              }}
            >
              <div
                role="status"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: t.description ? "14px 16px" : "12px 16px",
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
                    background: `linear-gradient(180deg, ${meta.accent} 0%, ${meta.accent2} 100%)`,
                  }}
                />

                {/* Icon badge */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 32, height: 32,
                    borderRadius: 10,
                    background: meta.bg,
                    border: `1px solid ${meta.accent}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: t.phase === "enter"
                      ? "op-alert-icon-in 440ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms both"
                      : undefined,
                  }}
                >
                  {t.icon ?? <IconComp size={16} color={meta.accent} strokeWidth={2.5} />}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 20, paddingTop: 2 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.35,
                    }}
                  >
                    {t.title}
                  </div>
                  {t.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.45,
                        marginTop: 3,
                      }}
                    >
                      {t.description}
                    </div>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => dismiss(t.key)}
                  aria-label="Dismiss notification"
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

                {/* Progress bar (only if auto-dismissing) */}
                {t.duration > 0 && (
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
                        background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent2})`,
                        transformOrigin: "left center",
                        animationName: t.phase === "visible" ? "op-alert-progress" : "none",
                        animationDuration: `${t.remaining}ms`,
                        animationTimingFunction: "linear",
                        animationFillMode: "forwards",
                        animationPlayState: t.paused ? "paused" : "running",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
