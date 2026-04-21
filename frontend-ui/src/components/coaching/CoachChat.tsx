"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { API_HOST } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  available: boolean;
  model: string | null;
}

const QUICK_PROMPTS = [
  "What are my biggest weaknesses?",
  "Am I overtrading?",
  "How can I improve my win rate?",
  "Give me a full coaching session",
  "What should I focus on this week?",
];

export default function CoachChat({ available, model }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    setError(null);
    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_HOST}/api/users/coaching/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: msg,
          conversation: [...messages, userMsg],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to get response");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      }
    } catch {
      setError("Network error — check your connection");
    }
    setLoading(false);
  };

  if (!available) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 text-center space-y-3">
        <Bot size={32} className="text-[var(--text-dim)] mx-auto" />
        <p className="text-sm text-[var(--text-muted)]">
          AI Coach requires an OpenRouter API key.
        </p>
        <p className="text-xs text-[var(--text-dim)]">
          Set <code className="font-mono bg-[var(--bg-muted)] px-1 rounded">OPENROUTER_API_KEY</code> in
          your backend environment to enable conversational coaching.
        </p>
        <p className="text-xs text-[var(--text-dim)]">
          Free models like <code className="font-mono bg-[var(--bg-muted)] px-1 rounded">meta-llama/llama-4-maverick:free</code> are
          supported via OpenRouter.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            AI Trade Coach
          </span>
        </div>
        {model && (
          <span className="text-[10px] font-mono text-[var(--text-dim)]">
            {model.split("/").pop()}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)] text-center">
              Ask me anything about your trading performance, habits, or how to improve.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1.5 text-[11px] rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-[var(--accent-primary)]" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center shrink-0">
                <User size={14} className="text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[var(--accent-primary)]" />
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-muted)]">
              <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-[var(--accent-red)] text-center">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border-primary)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm bg-[var(--bg-muted)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none disabled:opacity-50 placeholder:text-[var(--text-dim)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
