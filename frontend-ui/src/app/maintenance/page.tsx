"use client";

import { useEffect, useState } from "react";
import { Wrench, Github, Twitter, Mail, MessageCircle } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Links {
  email?: string;
  github?: string;
  twitter?: string;
  discord?: string;
}

export default function MaintenancePage() {
  const [message, setMessage] = useState(
    "We are currently undergoing scheduled maintenance. Please check back soon."
  );
  const [links, setLinks] = useState<Links>({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/maintenance-status/`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.message) setMessage(data.message);
        if (data.links) setLinks(data.links);
        if (!data.enabled) {
          window.location.href = "/";
        }
      })
      .catch(() => {});
  }, []);

  const hasLinks =
    links.email || links.github || links.twitter || links.discord;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3.5">
          <img src="/logo.png" alt={APP_CONFIG.name} width={40} height={40} />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg tracking-[4px] text-[var(--text-primary)]">
              OPEN
            </span>
            <span className="font-mono text-lg font-bold tracking-[4px] text-[var(--accent-primary)]">
              PAPERTRADE
            </span>
          </div>
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
          <Wrench size={36} className="text-[var(--accent-primary)]" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[40px] font-medium text-[var(--text-primary)]">
            Under Maintenance
          </h1>
          <p className="text-base text-[var(--text-muted)] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Contact / Social Links */}
        {hasLinks && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[var(--text-dim)]">Stay in touch</p>
            <div className="flex items-center gap-3">
              {links.github && (
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                  title="GitHub"
                >
                  <Github size={20} />
                </a>
              )}
              {links.twitter && (
                <a
                  href={links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                  title="Twitter / X"
                >
                  <Twitter size={20} />
                </a>
              )}
              {links.discord && (
                <a
                  href={links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                  title="Discord"
                >
                  <MessageCircle size={20} />
                </a>
              )}
              {links.email && (
                <a
                  href={`mailto:${links.email}`}
                  className="flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                  title={links.email}
                >
                  <Mail size={20} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
