"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  UserMinus,
  Copy,
  Layers,
  CheckCircle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import CopySetupModal from "@/components/copy-trading/CopySetupModal";
import { API_HOST } from "@/lib/api";

export default function CopyTraderPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showModal, setShowModal] = useState<"copy" | "mirror" | null>(null);
  const [copyHistory, setCopyHistory] = useState<any[]>([]);
  const [existingRel, setExistingRel] = useState<any>(null);

  useEffect(() => {
    if (!username) return;

    // Load public profile
    fetch(`${API_HOST}/api/users/profile/${username}/public/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProfile(d))
      .catch(() => {});

    // Check follow status
    fetch(`${API_HOST}/api/users/copy-trading/following/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const follows = d.following || [];
        const f = follows.find((x: any) => x.leader?.username === username);
        if (f) {
          setIsFollowing(true);
          if (f.copyRelationship) setExistingRel(f.copyRelationship);
        }
      })
      .catch(() => {});

    setLoading(false);
  }, [username]);

  const handleFollow = async () => {
    setFollowLoading(true);
    if (isFollowing) {
      await fetch(`${API_HOST}/api/users/copy-trading/follow/${username}/`, {
        method: "DELETE", credentials: "include",
      });
      setIsFollowing(false);
    } else {
      const res = await fetch(`${API_HOST}/api/users/copy-trading/follow/${username}/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedDelay: "1H" }),
      });
      if (res.ok) setIsFollowing(true);
    }
    setFollowLoading(false);
  };

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/copy-trading")}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-[28px] font-medium tracking-[-1px] text-[var(--text-primary)]">
              {profile?.name || username}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">@{username}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                isFollowing
                  ? "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--accent-red)]"
                  : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
              }`}
            >
              {followLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isFollowing ? (
                <UserMinus size={14} />
              ) : (
                <UserPlus size={14} />
              )}
              {isFollowing ? "Unfollow" : "Follow"}
            </button>

            {!existingRel && (
              <>
                <button
                  onClick={() => setShowModal("copy")}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
                >
                  <Copy size={14} /> Copy Trades
                </button>
                <button
                  onClick={() => setShowModal("mirror")}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Layers size={14} /> Mirror Portfolio
                </button>
              </>
            )}

            {existingRel && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--accent-green)]/10 text-[var(--accent-green)]">
                <CheckCircle size={14} /> Copying ({existingRel.status})
              </div>
            )}
          </div>
        </div>

        {/* Profile Stats */}
        {profile && (
          <div className="grid grid-cols-5 gap-4">
            <ProfileStat label="Total Trades" value={String(profile.totalTrades ?? 0)} />
            <ProfileStat label="Win Rate" value={`${profile.winRate ?? 0}%`} />
            <ProfileStat
              label="Return"
              value={`${(profile.portfolioReturn ?? 0) >= 0 ? "+" : ""}${(profile.portfolioReturn ?? 0).toFixed(1)}%`}
              positive={(profile.portfolioReturn ?? 0) >= 0}
            />
            <ProfileStat label="Holdings" value={String(profile.holdingsCount ?? 0)} />
            <ProfileStat label="Rank" value={profile.rank || "—"} />
          </div>
        )}

        {/* Existing copy relationship details */}
        {existingRel && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-4">
            <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
              COPY TRADING STATUS
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] text-[var(--text-dim)]">Status</div>
                <div className={`text-sm font-semibold ${
                  existingRel.status === "ACTIVE" ? "text-[var(--accent-green)]" : "text-yellow-400"
                }`}>
                  {existingRel.status}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-dim)]">Allocated</div>
                <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                  ${existingRel.allocatedFunds?.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-dim)]">Remaining</div>
                <div className="text-sm font-mono font-semibold text-[var(--text-secondary)]">
                  ${existingRel.remainingFunds?.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-dim)]">Delay</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {existingRel.tradeDelay === "NONE" ? "Instant" : existingRel.tradeDelay}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        {!existingRel && (
          <div className="bg-[var(--bg-card-inner)] rounded-xl border border-[var(--border-primary)] p-6 space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              How Copy Trading Works
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <Step num={1} title="Allocate Funds" desc="Set aside virtual capital for copy trading. This is reserved from your buying power." />
              <Step num={2} title="Auto-Copy Trades" desc="When this trader buys or sells, the same trade is proportionally executed in your account." />
              <Step num={3} title="Track Performance" desc="Monitor your copy P&L, compare against your manual trades, pause or stop anytime." />
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <CopySetupModal
            username={username}
            displayName={profile?.name || username}
            mode={showModal}
            onClose={() => setShowModal(null)}
            onSuccess={() => {
              setShowModal(null);
              router.push("/copy-trading");
            }}
          />
        )}
      </main>
    </div>
  );
}

function ProfileStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
      <span className="text-[10px] font-medium text-[var(--text-muted)] tracking-wide">{label}</span>
      <div className={`font-mono text-lg font-semibold mt-1 ${
        positive === undefined ? "text-[var(--text-primary)]"
        : positive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
      }`}>
        {value}
      </div>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="space-y-2">
      <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
        <span className="text-sm font-bold text-[var(--accent-primary)]">{num}</span>
      </div>
      <h4 className="text-sm font-medium text-[var(--text-primary)]">{title}</h4>
      <p className="text-xs text-[var(--text-muted)]">{desc}</p>
    </div>
  );
}
