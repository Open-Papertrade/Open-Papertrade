"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileSearch, Send, ExternalLink, AlertTriangle, Sparkles, Plus, CheckCircle2, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { API_HOST } from "@/lib/api";

interface Citation {
  index: number;
  chunk_id: number;
  company_ticker: string;
  filing_form: string;
  filing_date: string;
  section_name: string;
  snippet: string;
  source_url: string;
  score: number;
}

interface AskResponse {
  question: string;
  answer: string;
  declined: boolean;
  confidence: string;
  citations: Citation[];
  usage?: { provider: string; model: string; input_tokens: number; output_tokens: number };
  trace?: {
    subquestions: { question: string; tickers: string[]; reason: string }[];
    sub_results: any[];
    usage: { provider: string; model: string; input_tokens: number; output_tokens: number };
  };
}

interface CompanyRow {
  id: number;
  ticker: string;
  name: string;
  filings_count: number;
}

interface IngestJob {
  id: number;
  url: string;
  status: "pending" | "running" | "success" | "failed";
  progress: string;
  error: string;
  section_count: number;
  chunk_count: number;
  created_at: string;
  finished_at: string | null;
  filing: {
    id: number;
    company_ticker: string;
    company_name: string;
    form_type: string;
    filed_date: string;
    source_url: string;
  } | null;
}

const SAMPLE_QUESTIONS = [
  "What are Apple's largest risk factors?",
  "How does NVIDIA describe demand for its data center GPUs?",
  "Compare Apple's and NVIDIA's approach to R&D investment.",
  "What does Tesla say about production capacity for the Cybertruck?",
];

export default function FilingsPage() {
  const [question, setQuestion] = useState("");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useHybrid, setUseHybrid] = useState(true);
  const [useRerank, setUseRerank] = useState(true);
  const [useAgent, setUseAgent] = useState(false);

  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestSubmitting, setIngestSubmitting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const activeJobsRef = useRef(false);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_HOST}/api/filings/companies/`, { credentials: "include" });
      if (!res.ok) return;
      setCompanies(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_HOST}/api/filings/ingest/jobs/?limit=8`, { credentials: "include" });
      if (!res.ok) return;
      const data: IngestJob[] = await res.json();
      setJobs(data);
      const hasActive = data.some(j => j.status === "pending" || j.status === "running");
      if (!hasActive && activeJobsRef.current) {
        activeJobsRef.current = false;
        loadCompanies();
      } else if (hasActive) {
        activeJobsRef.current = true;
      }
    } catch { /* ignore */ }
  }, [loadCompanies]);

  useEffect(() => { loadCompanies(); loadJobs(); }, [loadCompanies, loadJobs]);

  useEffect(() => {
    const anyActive = jobs.some(j => j.status === "pending" || j.status === "running");
    if (!anyActive) return;
    const interval = setInterval(() => { loadJobs(); }, 2000);
    return () => clearInterval(interval);
  }, [jobs, loadJobs]);

  const submitIngest = async () => {
    const url = ingestUrl.trim();
    if (!url || ingestSubmitting) return;
    setIngestSubmitting(true);
    setIngestError(null);
    try {
      const res = await fetch(`${API_HOST}/api/filings/ingest/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enqueue ingestion");
      setIngestUrl("");
      loadJobs();
    } catch (e: any) {
      setIngestError(e.message);
    }
    setIngestSubmitting(false);
  };

  const submit = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_HOST}/api/filings/ask/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: question.trim(),
          hybrid: useHybrid,
          rerank: useRerank,
          agent: useAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const renderAnswerWithCitations = (text: string, citations: Citation[]) => {
    const parts = text.split(/(\[S\d+\])/g);
    return parts.map((part, i) => {
      const m = part.match(/^\[S(\d+)\]$/);
      if (!m) return <span key={i}>{part}</span>;
      const n = parseInt(m[1], 10);
      const found = citations.find(c => c.index === n);
      return (
        <sup key={i} className="mx-0.5">
          <a
            href={found?.source_url || "#"}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent-primary)] hover:underline font-medium"
            title={found ? `${found.company_ticker} ${found.filing_form} · ${found.section_name}` : `Source ${n}`}
          >
            [{n}]
          </a>
        </sup>
      );
    });
  };

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageHeader title="Filings Research" subtitle="Ask questions about SEC filings — every answer cites its sources" />

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
            <label className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2 block">
              Your question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder="e.g., How has Tesla described production capacity constraints?"
              rows={3}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={useHybrid} onChange={(e) => setUseHybrid(e.target.checked)} className="accent-[var(--accent-primary)]" />
                  Hybrid (dense + BM25)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={useRerank} onChange={(e) => setUseRerank(e.target.checked)} className="accent-[var(--accent-primary)]" />
                  Cross-encoder rerank
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={useAgent} onChange={(e) => setUseAgent(e.target.checked)} className="accent-[var(--accent-primary)]" />
                  <Sparkles size={12} /> Agentic mode
                </label>
              </div>

              <button
                onClick={submit}
                disabled={loading || !question.trim()}
                className="flex items-center gap-2 bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Ask
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {SAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs px-2.5 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-[var(--accent-primary)]" />
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Add a filing by URL
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={ingestUrl}
                onChange={(e) => setIngestUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitIngest(); }}
                placeholder="https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm"
                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <button
                onClick={submitIngest}
                disabled={ingestSubmitting || !ingestUrl.trim()}
                className="flex items-center gap-1.5 bg-[var(--bg-primary)] hover:border-[var(--accent-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-medium px-3 py-2 rounded-lg transition disabled:opacity-40"
              >
                {ingestSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Ingest
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Paste any SEC EDGAR filing URL (10-K, 10-Q, 8-K). Ingestion runs in the background and takes 30–120 seconds.
            </p>

            {ingestError && (
              <div className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {ingestError}
              </div>
            )}

            {jobs.length > 0 && (
              <div className="pt-2 border-t border-[var(--border-color)] space-y-1.5">
                {jobs.map(j => (
                  <div key={j.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {j.status === "success" && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                      {j.status === "failed" && <XCircle size={12} className="text-red-500 shrink-0" />}
                      {(j.status === "pending" || j.status === "running") && <Loader2 size={12} className="animate-spin text-[var(--accent-primary)] shrink-0" />}
                      <span className="text-[var(--text-secondary)] truncate">
                        {j.filing
                          ? `${j.filing.company_ticker} · ${j.filing.form_type} · ${j.filing.filed_date}`
                          : j.url.split("/").slice(-2).join("/")}
                      </span>
                    </div>
                    <span className="text-[var(--text-muted)] text-[10px] shrink-0">
                      {j.status === "success"
                        ? `${j.chunk_count} chunks`
                        : j.status === "failed"
                        ? (j.error.slice(0, 60) || "failed")
                        : (j.progress || j.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {companies.length > 0 && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Ingested corpus
              </div>
              <div className="flex flex-wrap gap-2">
                {companies.map(c => (
                  <div key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <span className="font-semibold text-[var(--text-primary)]">{c.ticker}</span>
                    <span className="text-[var(--text-muted)] mx-1">·</span>
                    <span className="text-[var(--text-muted)]">{c.filings_count} filings</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-2 text-sm text-red-400">
              <AlertTriangle size={16} className="mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileSearch size={16} className="text-[var(--accent-primary)]" />
                <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Answer
                </div>
                <div className="text-xs text-[var(--text-muted)] ml-auto">
                  confidence: <span className="text-[var(--text-primary)]">{result.confidence}</span>
                  {result.declined && <span className="ml-2 text-yellow-500">declined</span>}
                </div>
              </div>

              <div className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                {renderAnswerWithCitations(result.answer, result.citations)}
              </div>

              {result.trace && (
                <details className="text-xs text-[var(--text-muted)]">
                  <summary className="cursor-pointer">Agent plan ({result.trace.subquestions.length} sub-questions)</summary>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {result.trace.subquestions.map((s, i) => (
                      <li key={i}>
                        <span className="text-[var(--text-primary)]">{s.question}</span>
                        {s.tickers.length > 0 && (
                          <span className="ml-1 text-[var(--accent-primary)]">[{s.tickers.join(", ")}]</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {result.citations.length > 0 && (
                <div className="pt-3 border-t border-[var(--border-color)]">
                  <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Citations
                  </div>
                  <div className="space-y-2">
                    {result.citations.map(c => (
                      <div key={c.index} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[var(--accent-primary)]">[{c.index}]</span>
                            <span className="font-semibold text-[var(--text-primary)]">{c.company_ticker}</span>
                            <span className="text-[var(--text-muted)]">{c.filing_form}</span>
                            <span className="text-[var(--text-muted)]">{c.filing_date}</span>
                            <span className="text-[var(--text-muted)]">· {c.section_name}</span>
                          </div>
                          <a href={c.source_url} target="_blank" rel="noreferrer"
                             className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition inline-flex items-center gap-1">
                            source <ExternalLink size={11} />
                          </a>
                        </div>
                        <div className="text-[var(--text-secondary)] leading-relaxed">{c.snippet}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(result.usage || result.trace?.usage) && (
                <div className="text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]">
                  {result.usage?.provider || result.trace?.usage.provider} · {result.usage?.model || result.trace?.usage.model}
                  {" · "}
                  in: {result.usage?.input_tokens ?? result.trace?.usage.input_tokens} tok
                  {" · "}
                  out: {result.usage?.output_tokens ?? result.trace?.usage.output_tokens} tok
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
