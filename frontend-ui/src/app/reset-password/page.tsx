"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CircleCheck, CircleX, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-6 max-w-[400px] text-center px-8">
          <Logo />
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <CircleX size={36} className="text-red-500" />
          </div>
          <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
            Invalid reset link
          </h2>
          <p className="text-[15px] text-[var(--text-muted)]">
            This password reset link is missing a token. Please request a new one.
          </p>
          <div className="flex gap-4 mt-4">
            <Link
              href="/forgot-password"
              className="rounded-lg border border-[var(--border-muted)] px-6 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Request new link
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-6 max-w-[400px] text-center px-8">
          <Logo />
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CircleCheck size={36} className="text-green-500" />
          </div>
          <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
            Password reset!
          </h2>
          <p className="text-[15px] text-[var(--text-muted)]">
            Your password has been updated successfully. You can now log in with your new password.
          </p>
          <Link
            href="/login"
            className="rounded-lg bg-[var(--accent-primary)] px-8 py-4 text-base font-semibold text-white hover:opacity-90 transition-opacity mt-2"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-6 w-full max-w-[400px] px-8">
        <Logo />

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
              Set new password
            </h2>
            <p className="text-[15px] text-[var(--text-muted)]">
              Enter your new password below.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* New Password */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[var(--border-muted)] bg-transparent px-4 py-3.5 pr-12 text-[15px] text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border-muted)] bg-transparent px-4 py-3.5 text-[15px] text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full rounded-lg bg-[var(--accent-primary)] py-4 text-base font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>

          <Link
            href="/login"
            className="text-sm text-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}

function Logo() {
  return (
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
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
          <Loader2 size={48} className="text-[var(--accent-primary)] animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
