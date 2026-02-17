"use client";

import { useState, useEffect } from "react";
import { Newspaper, ExternalLink, Clock, TrendingUp } from "lucide-react";
import { stockAPI, NewsArticle } from "@/lib/api";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0 || isNaN(diffMs)) return "";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--bg-muted)] ${className}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Hero skeleton */}
      <div className="rounded-xl overflow-hidden border border-[var(--border-primary)]">
        <Skeleton className="w-full h-48 rounded-none" />
        <div className="p-4 bg-[var(--bg-card-inner)] flex flex-col gap-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
      {/* Right column skeletons */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-2.5 flex-1">
            <Skeleton className="w-18 h-full shrink-0 rounded-lg" />
            <div className="flex-1 flex flex-col gap-2 justify-center">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroArticle({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 transition-all duration-200"
    >
      {/* Hero image */}
      <div className="relative w-full flex-1 min-h-48 overflow-hidden bg-[var(--bg-card-inner)]">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/5">
            <Newspaper size={40} className="text-[var(--accent-primary)]/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Source badge on image */}
        {article.source && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/50 text-white/90 backdrop-blur-sm">
            {article.source}
          </span>
        )}
        {/* External link indicator */}
        <div className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ExternalLink size={12} className="text-white/80" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-[var(--bg-card-inner)]">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors duration-200">
          {article.title}
        </h3>
        {article.publishedAt && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <Clock size={11} className="text-[var(--text-dim)]" />
            <span className="text-[11px] text-[var(--text-dim)] font-mono">
              {timeAgo(article.publishedAt)}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}

function ArticleRow({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-muted)] transition-colors duration-150 group"
    >
      {/* Thumbnail */}
      <div className="w-18 h-full rounded-lg overflow-hidden shrink-0 bg-[var(--bg-card-inner)]">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent">
            <Newspaper size={14} className="text-[var(--text-dim)]" />
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors duration-150">
          {article.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {article.source && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-muted)] text-[var(--text-muted)] group-hover:bg-[var(--border-muted)]">
              {article.source}
            </span>
          )}
          {article.publishedAt && (
            <span className="text-[10px] text-[var(--text-dim)] font-mono">
              {timeAgo(article.publishedAt)}
            </span>
          )}
        </div>
      </div>

      {/* External link icon */}
      <ExternalLink
        size={13}
        className="text-[var(--text-dim)] shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      />
    </a>
  );
}

function SecondaryCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 transition-all duration-200"
    >
      <div className="relative w-full h-28 overflow-hidden bg-[var(--bg-card-inner)]">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent">
            <Newspaper size={24} className="text-[var(--text-dim)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {article.source && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-black/50 text-white/90 backdrop-blur-sm">
            {article.source}
          </span>
        )}
      </div>
      <div className="p-3 bg-[var(--bg-card-inner)] flex-1 flex flex-col justify-between">
        <p className="text-[12px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors duration-200">
          {article.title}
        </p>
        {article.publishedAt && (
          <span className="text-[10px] text-[var(--text-dim)] font-mono mt-2">
            {timeAgo(article.publishedAt)}
          </span>
        )}
      </div>
    </a>
  );
}

export default function StockNews({ symbol }: { symbol: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    stockAPI
      .getNews(symbol)
      .then((res) => {
        if (!cancelled) setArticles(res.articles);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Layout split: hero (1st), secondary cards (2nd-3rd), remaining rows
  const heroArticle = articles[0];
  const sideArticles = articles.slice(1, 5);
  const secondaryCards = articles.slice(5, 7);
  const remainingArticles = articles.slice(7);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-[var(--accent-primary)]" />
          <span className="text-[10px] font-bold tracking-[1px] text-[var(--text-muted)]">
            LATEST NEWS
          </span>
        </div>
        {!loading && articles.length > 0 && (
          <span className="text-[10px] font-mono text-[var(--text-dim)]">
            {articles.length} article{articles.length !== 1 && "s"}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center mb-3">
            <Newspaper size={18} className="text-[var(--accent-red)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Could not load news
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Try again later
          </p>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-muted)] flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-[var(--text-dim)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No news available
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            News for {symbol} will appear here
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Top row: Hero + side articles */}
          <div className="grid grid-cols-2 gap-4">
            {/* Hero card (left) */}
            {heroArticle && <HeroArticle article={heroArticle} />}

            {/* Stacked article rows (right) */}
            {sideArticles.length > 0 && (
              <div className="flex flex-col gap-1 justify-between">
                {sideArticles.map((article, idx) => (
                  <ArticleRow key={idx} article={article} />
                ))}
              </div>
            )}
          </div>

          {/* Secondary cards row */}
          {secondaryCards.length > 0 && (
            <>
              <div className="h-px bg-[var(--border-primary)]" />
              <div className="grid grid-cols-2 gap-4">
                {secondaryCards.map((article, idx) => (
                  <SecondaryCard key={idx} article={article} />
                ))}
              </div>
            </>
          )}

          {/* Remaining articles as compact rows */}
          {remainingArticles.length > 0 && (
            <>
              <div className="h-px bg-[var(--border-primary)]" />
              <div className="flex flex-col gap-1">
                {remainingArticles.map((article, idx) => (
                  <ArticleRow key={idx} article={article} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
