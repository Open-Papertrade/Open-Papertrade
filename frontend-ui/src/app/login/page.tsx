"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const { login, resendVerification, verify2FALogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setUnverifiedEmail("");
    setResendMessage("");
    try {
      const result = await login(email, password);
      if (result.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTempToken(result.tempToken || "");
      } else {
        router.push("/");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      // Check if it's an unverified email error
      if (message.toLowerCase().includes("verify your email")) {
        setUnverifiedEmail(email);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await verify2FALogin(tempToken, twoFactorCode);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      const message = await resendVerification(unverifiedEmail);
      setResendMessage(message);
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-primary)]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-[var(--bg-sidebar)] p-[60px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity">
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

        {/* Center Content */}
        <div className="flex flex-col gap-8">
          <h1 className="font-serif text-[56px] font-medium leading-[1.1] tracking-[-1px] text-[var(--text-primary)]">
            Trade Smarter.
            <br />
            Risk Nothing.
          </h1>
          <p className="text-lg text-[var(--text-muted)] leading-[1.6]">
            Practice with $100K virtual funds.
            <br />
            Master the markets before going live.
          </p>

          {/* Stats */}
          <div className="flex gap-12">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[32px] font-semibold text-[var(--accent-primary)]">
                10,000+
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                Stocks &amp; Crypto
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[32px] font-semibold text-[var(--accent-primary)]">
                Live
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                Market Prices
              </span>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-primary)] p-6">
          <p className="text-base italic text-[var(--text-primary)] leading-[1.5]">
            &ldquo;Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--border-muted)]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Jane Doe
              </span>
              <span className="text-[13px] text-[var(--text-muted)]">
                Day Trader, 2 years on platform
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[520px] lg:min-w-[520px] px-8 py-[60px] lg:px-[80px]">
        {/* Mobile Logo */}
        <div className="flex items-center gap-3.5 mb-12 lg:hidden">
          <img src="/logo.png" alt="Open Papertrade" width={40} height={40} />
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg tracking-[4px] text-[var(--text-primary)]">
              OPEN
            </span>
            <span className="font-mono text-lg font-bold tracking-[4px] text-[var(--accent-primary)]">
              PAPERTRADE
            </span>
          </div>
        </div>

        {twoFactorRequired ? (
          <form onSubmit={handle2FASubmit} className="flex flex-col gap-8 w-full max-w-[360px]">
            <div className="flex flex-col items-center lg:items-start gap-2">
              <h2 className="font-serif text-[32px] font-medium text-[var(--text-primary)]">
                Two-Factor Authentication
              </h2>
              <p className="text-[15px] text-[var(--text-muted)]">
                Enter the 6-digit code from your authenticator app, or a backup code
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Verification Code
              </label>
              <input
                type="text"
                placeholder="Enter code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                maxLength={8}
                autoFocus
                className="w-full rounded-lg border border-[var(--border-muted)] bg-transparent px-4 py-3.5 text-center text-2xl font-mono tracking-[8px] text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !twoFactorCode}
              className="w-full rounded-lg bg-[var(--accent-primary)] py-4 text-base font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTwoFactorRequired(false);
                setTempToken("");
                setTwoFactorCode("");
                setError("");
              }}
              className="text-sm font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
            >
              Back to login
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-[360px]">
          {/* Form Header */}
          <div className="flex flex-col items-center lg:items-start gap-2">
            <h2 className="font-serif text-[32px] font-medium text-[var(--text-primary)]">
              Welcome back
            </h2>
            <p className="text-[15px] text-[var(--text-muted)]">
              Log in to your account
            </p>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-muted)] bg-transparent px-4 py-3.5 text-[15px] text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[13px] font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
              {unverifiedEmail && (
                <div className="mt-2 pt-2 border-t border-red-500/20">
                  <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="text-[var(--accent-primary)] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {resendLoading ? "Sending..." : "Resend verification email"}
                  </button>
                </div>
              )}
            </div>
          )}
          {resendMessage && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
              {resendMessage}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[var(--accent-primary)] py-4 text-base font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>

          {/* Sign Up Prompt */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm text-[var(--text-muted)]">
              Don&apos;t have an account?
            </span>
            <Link
              href="/signup"
              className="text-sm font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
            >
              Sign up
            </Link>
          </div>

        </form>
        )}
      </div>
    </div>
  );
}
