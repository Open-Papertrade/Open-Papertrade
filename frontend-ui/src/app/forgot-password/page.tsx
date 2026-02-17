"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-6 w-full max-w-[400px] px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity mb-4">
          <img src="/logo.png" alt="Open Papertrade" width={40} height={40} />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg tracking-[4px] text-[var(--text-primary)]">
              OPEN
            </span>
            <span className="font-mono text-lg font-bold tracking-[4px] text-[var(--accent-primary)]">
              PAPERTRADE
            </span>
          </div>
        </Link>

        {sent ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <Mail size={32} className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)] text-center">
              Check your email
            </h2>
            <p className="text-[15px] text-[var(--text-muted)] text-center leading-relaxed">
              If an account exists for <span className="text-[var(--text-primary)] font-medium">{email}</span>, we&apos;ve sent a password reset link. The link expires in 1 hour.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity mt-2"
            >
              Try a different email
            </button>
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-4"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
                Forgot password?
              </h2>
              <p className="text-[15px] text-[var(--text-muted)]">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-[var(--border-muted)] bg-transparent px-4 py-3.5 text-[15px] text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full rounded-lg bg-[var(--accent-primary)] py-4 text-base font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
