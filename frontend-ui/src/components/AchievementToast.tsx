"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

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

export function AchievementToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AchievementData[]>([]);
  const [current, setCurrent] = useState<AchievementData | null>(null);
  const [visible, setVisible] = useState(false);

  const showAchievements = useCallback((achievements: AchievementData[]) => {
    if (achievements.length === 0) return;
    setQueue(prev => [...prev, ...achievements]);
  }, []);

  // Show next achievement from queue
  useEffect(() => {
    if (current || queue.length === 0) return;

    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrent(next);
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setVisible(true));
  }, [queue, current]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!current) return;

    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for exit animation before clearing
      setTimeout(() => setCurrent(null), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [current]);

  return (
    <AchievementToastContext.Provider value={{ showAchievements }}>
      {children}
      {current && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            transform: visible ? "translateX(0)" : "translateX(calc(100% + 32px))",
            opacity: visible ? 1 : 0,
            transition: "transform 0.3s ease, opacity 0.3s ease",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 20px",
              background: "var(--bg-primary)",
              border: "1px solid var(--accent-primary)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(255, 92, 0, 0.15), 0 2px 8px rgba(0,0,0,0.3)",
              minWidth: 280,
              maxWidth: 380,
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{current.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--accent-primary)",
                  marginBottom: 2,
                }}
              >
                Achievement Unlocked
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {current.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.3,
                  marginTop: 1,
                }}
              >
                {current.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </AchievementToastContext.Provider>
  );
}
