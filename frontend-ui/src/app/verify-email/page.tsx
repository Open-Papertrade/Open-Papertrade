"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found. Please check your email link.");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        // Redirect to dashboard after a short delay
        setTimeout(() => router.push("/"), 2000);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [searchParams, verifyEmail, router]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-6 max-w-[400px] text-center px-8">
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

        {status === "loading" && (
          <>
            <Loader2 size={48} className="text-[var(--accent-primary)] animate-spin" />
            <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
              Verifying your email...
            </h2>
            <p className="text-[15px] text-[var(--text-muted)]">
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CircleCheck size={36} className="text-green-500" />
            </div>
            <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
              Email verified!
            </h2>
            <p className="text-[15px] text-[var(--text-muted)]">
              Your account is now active. Redirecting you to the dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <CircleX size={36} className="text-red-500" />
            </div>
            <h2 className="font-serif text-[28px] font-medium text-[var(--text-primary)]">
              Verification failed
            </h2>
            <p className="text-[15px] text-red-400">
              {errorMessage}
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/signup"
                className="rounded-lg border border-[var(--border-muted)] px-6 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Sign up again
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Log in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
          <Loader2 size={48} className="text-[var(--accent-primary)] animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
