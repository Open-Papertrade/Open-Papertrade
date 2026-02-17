"use client";

import { useState, useEffect, ReactNode } from "react";
import { Search, Plus, Download } from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";
import SearchModal from "./SearchModal";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  primaryButtonText?: string;
  primaryButtonIcon?: "plus" | "download";
  onPrimaryClick?: () => void;
  extraActions?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  primaryButtonText = "New Trade",
  primaryButtonIcon = "plus",
  onPrimaryClick,
  extraActions,
}: PageHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Handle keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-[38px] font-medium tracking-[-1px] text-[var(--text-primary)]">
              {title}
            </h1>
            <ConnectionStatus />
          </div>
          <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {extraActions}
          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-muted)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Search size={16} className="text-[var(--text-muted)]" />
            <span className="text-[13px] text-[var(--text-dim)]">Search...</span>
            <span className="font-mono text-[11px] text-[var(--text-dim)] ml-4">
              ⌘K
            </span>
          </button>
          {/* Primary Button */}
          <button
            onClick={onPrimaryClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] transition-colors"
          >
            {primaryButtonIcon === "plus" ? (
              <Plus size={16} className="text-white" />
            ) : (
              <Download size={16} className="text-white" />
            )}
            <span className="text-[13px] font-medium text-white">
              {primaryButtonText}
            </span>
          </button>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
