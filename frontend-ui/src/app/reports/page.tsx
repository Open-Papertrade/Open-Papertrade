"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import {
  Download,
  FileImage,
  FileText,
  Share2,
  X,
  Linkedin,
  Twitter,
  Instagram,
  Link as LinkIcon,
  Loader2,
  BarChart3,
  Lock,
  CalendarDays,
  CalendarRange,
  Sparkles,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import {
  WrappedReport,
  WeeklyReport,
  MonthlyReport,
} from "@/components/reports";
import { userAPI, API_HOST } from "@/lib/api";
import { usePortfolio } from "@/context/PortfolioContext";

const tabConfig = [
  { id: "Weekly" as const, label: "Weekly", desc: "This week's performance", icon: CalendarDays },
  { id: "Monthly" as const, label: "Monthly", desc: "Last month's recap", icon: CalendarRange },
  { id: "Yearly Wrapped" as const, label: "Wrapped", desc: "Annual year in review", icon: Sparkles },
];
type Tab = (typeof tabConfig)[number]["id"];

export default function ReportsPage() {
  const { user } = usePortfolio();
  const [activeTab, setActiveTab] = useState<Tab>("Weekly");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchReport() {
      setLoading(true);
      setError(null);
      setEmpty(false);
      setLocked(null);
      setReportData(null);

      try {
        let data: any;
        if (activeTab === "Weekly") {
          data = await userAPI.getWeeklyReport();
        } else if (activeTab === "Monthly") {
          data = await userAPI.getMonthlyReport();
        } else {
          data = await userAPI.getYearlyReport();
        }

        if (cancelled) return;

        if (data.locked) {
          setLocked(data.message);
          setReportData(null);
        } else if (data.empty) {
          setEmpty(true);
          setReportData(null);
        } else {
          setReportData(data);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReport();
    return () => { cancelled = true; };
  }, [activeTab, retryKey]);

  const fileName = activeTab.toLowerCase().replace(" ", "-") + "-report";

  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    if (!reportRef.current) return null;
    const dataUrl = await domToPng(reportRef.current, {
      scale: 2,
      quality: 1,
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }, []);

  const handleDownloadPNG = useCallback(async () => {
    const blob = await captureBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [captureBlob, fileName]);

  const handleDownloadPDF = useCallback(async () => {
    const blob = await captureBlob();
    if (!blob) return;
    const dataUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => { img.onload = r; });
    const pdfW = img.width * 0.264583;
    const pdfH = img.height * 0.264583;
    const pdf = new jsPDF({
      orientation: pdfW > pdfH ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfW, pdfH],
    });
    pdf.addImage(img.src, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(`${fileName}.pdf`);
    URL.revokeObjectURL(dataUrl);
  }, [captureBlob, fileName]);

  const handleCopyImage = useCallback(async () => {
    const blob = await captureBlob();
    if (!blob) return;
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [captureBlob]);

  const handleShareSocial = useCallback(
    async (platform: "linkedin" | "twitter" | "instagram") => {
      const blob = await captureBlob();
      if (!blob) return;

      // Try native share first (works on mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${fileName}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ title: `${activeTab} Report`, files: [file] });
            return;
          } catch { /* user cancelled */ }
        }
      }

      // Copy to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      } catch { /* clipboard may not be available */ }

      const text = encodeURIComponent(
        `Check out my ${activeTab} trading report! #OpenPaperTrade`
      );

      switch (platform) {
        case "twitter":
          window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
          break;
        case "linkedin":
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, "_blank");
          break;
        case "instagram": {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `${fileName}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
    },
    [captureBlob, fileName, activeTab]
  );

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const tabLabel = activeTab === "Yearly Wrapped" ? "Yearly" : activeTab;

  const resolvedAvatar = user.avatarUrl
    ? user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_HOST}${user.avatarUrl}`
    : null;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-7 py-8 px-10 overflow-auto">
          <PageHeader
            title="Reports"
            subtitle="Shareable trading report cards"
          />

          {/* Tabs */}
          <div className="flex gap-3">
            {tabConfig.map(({ id, label, desc, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => { setReportData(null); setActiveTab(id); }}
                  className={`group relative flex items-center gap-3 px-5 py-3.5 rounded-xl text-left transition-all duration-200 border ${
                    isActive
                      ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 shadow-[0_0_20px_rgba(255,92,0,0.08)]"
                      : "bg-[var(--bg-card)] border-[var(--border-primary)] hover:border-[var(--border-muted)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? "bg-[var(--accent-primary)]/15" : "bg-[var(--bg-card-inner)]"
                  }`}>
                    <Icon size={18} className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"} />
                  </div>
                  <div>
                    <span className={`block text-sm font-semibold transition-colors ${
                      isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                    }`}>
                      {label}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{desc}</span>
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[var(--accent-primary)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 size={40} className="text-[var(--accent-primary)] animate-spin mb-4" />
              <p className="text-base font-medium text-[var(--text-primary)]">
                Generating your {tabLabel} report...
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Crunching your trading data
              </p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center mb-4">
                <X size={28} className="text-[#EF4444]" />
              </div>
              <p className="text-base font-medium text-[var(--text-primary)]">
                Failed to load report
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{error}</p>
              <button
                onClick={() => setRetryKey((k) => k + 1)}
                className="mt-4 px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </div>
          )}

          {/* Locked state */}
          {!loading && !error && locked && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4">
                <Lock size={28} className="text-[var(--accent-primary)]" />
              </div>
              <p className="text-base font-medium text-[var(--text-primary)]">
                Report not yet available
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 text-center max-w-sm">
                {locked}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !locked && empty && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4">
                <BarChart3 size={28} className="text-[var(--accent-primary)]" />
              </div>
              <p className="text-base font-medium text-[var(--text-primary)]">
                No trades found for this period
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Start trading to generate your {tabLabel} report
              </p>
            </div>
          )}

          {/* Report preview */}
          {!loading && !error && !empty && !locked && reportData && (
            <div className="flex justify-center">
              <div
                ref={reportRef}
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ maxWidth: 1080 }}
              >
                {activeTab === "Weekly" && (
                  <WeeklyReport {...reportData} username={user.username} initials={user.initials} avatarUrl={resolvedAvatar} onShare={handleShare} />
                )}
                {activeTab === "Monthly" && (
                  <MonthlyReport {...reportData} username={user.username} initials={user.initials} avatarUrl={resolvedAvatar} onShare={handleShare} />
                )}
                {activeTab === "Yearly Wrapped" && (
                  <WrappedReport {...reportData} username={user.username} initials={user.initials} avatarUrl={resolvedAvatar} onShare={handleShare} />
                )}
              </div>
            </div>
          )}
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-muted)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                  <Share2 size={18} className="text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Share Report
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {activeTab} Report
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Download options */}
            <p className="text-xs font-medium text-[var(--text-muted)] tracking-wider mb-3">
              DOWNLOAD
            </p>
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleDownloadPNG}
                className="flex-1 flex flex-col items-center gap-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-muted)] p-4 hover:border-[var(--accent-primary)] transition-colors"
              >
                <FileImage size={22} className="text-[var(--accent-primary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">PNG</span>
                <span className="text-[11px] text-[var(--text-muted)]">High quality image</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex-1 flex flex-col items-center gap-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-muted)] p-4 hover:border-[var(--accent-primary)] transition-colors"
              >
                <FileText size={22} className="text-[#EF4444]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">PDF</span>
                <span className="text-[11px] text-[var(--text-muted)]">Print-ready document</span>
              </button>
            </div>

            {/* Social share */}
            <p className="text-xs font-medium text-[var(--text-muted)] tracking-wider mb-3">
              SHARE ON SOCIAL
            </p>
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleShareSocial("twitter")}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3.5 hover:border-[var(--text-secondary)] transition-colors"
              >
                <Twitter size={18} className="text-[var(--text-primary)]" />
                <span className="text-sm text-[var(--text-primary)]">X</span>
              </button>
              <button
                onClick={() => handleShareSocial("linkedin")}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3.5 hover:border-[#0A66C2] transition-colors"
              >
                <Linkedin size={18} className="text-[#0A66C2]" />
                <span className="text-sm text-[var(--text-primary)]">LinkedIn</span>
              </button>
              <button
                onClick={() => handleShareSocial("instagram")}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3.5 hover:border-[#E4405F] transition-colors"
              >
                <Instagram size={18} className="text-[#E4405F]" />
                <span className="text-sm text-[var(--text-primary)]">Instagram</span>
              </button>
            </div>

            {/* Copy image */}
            <button
              onClick={handleCopyImage}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3.5 hover:border-[var(--accent-primary)] transition-colors"
            >
              {copied ? (
                <>
                  <Download size={16} className="text-[#22C55E]" />
                  <span className="text-sm font-medium text-[#22C55E]">
                    Copied to clipboard!
                  </span>
                </>
              ) : (
                <>
                  <LinkIcon size={16} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Copy image to clipboard
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
