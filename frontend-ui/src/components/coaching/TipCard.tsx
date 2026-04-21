"use client";

import {
  Shield,
  Target,
  Brain,
  TrendingUp,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface Tip {
  id: string;
  priority: number;
  title: string;
  body: string;
  category: string;
}

interface Props {
  tip: Tip;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  risk: <Shield size={14} className="text-[var(--accent-red)]" />,
  performance: <Target size={14} className="text-[var(--accent-primary)]" />,
  behavior: <Brain size={14} className="text-purple-400" />,
  discipline: <Brain size={14} className="text-blue-400" />,
  timing: <Target size={14} className="text-yellow-400" />,
  positive: <Sparkles size={14} className="text-[var(--accent-green)]" />,
  education: <GraduationCap size={14} className="text-[var(--text-muted)]" />,
  getting_started: <TrendingUp size={14} className="text-[var(--accent-primary)]" />,
};

const PRIORITY_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: "CRITICAL", color: "text-[var(--accent-red)]" },
  2: { text: "IMPORTANT", color: "text-yellow-400" },
  3: { text: "GROWTH", color: "text-blue-400" },
  4: { text: "POSITIVE", color: "text-[var(--accent-green)]" },
  5: { text: "LEARN", color: "text-[var(--text-muted)]" },
};

export default function TipCard({ tip }: Props) {
  const icon = CATEGORY_ICONS[tip.category] || CATEGORY_ICONS.education;
  const priority = PRIORITY_LABELS[tip.priority] || PRIORITY_LABELS[5];

  return (
    <div className="bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)] p-4 space-y-2 hover:border-[var(--border-muted)] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-medium text-[var(--text-primary)]">
            {tip.title}
          </h4>
        </div>
        <span className={`text-[9px] font-bold tracking-wider ${priority.color}`}>
          {priority.text}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {tip.body}
      </p>
    </div>
  );
}
