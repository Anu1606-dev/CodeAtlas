import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { ChatCitation } from "@codeatlas/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CodeBlock from "./CodeBlock";

const API_URL = import.meta.env.VITE_API_URL;
const CITATIONS_MARKER = "\n<<<CITATIONS>>>\n";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
}

interface Segment {
  type: "text" | "code";
  content: string;
  lang?: string;
}

function splitCodeFences(text: string): Segment[] {
  const parts: Segment[] = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    parts.push({ type: "code", content: match[2].trim(), lang: match[1] || "text" });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: "text", content: text.slice(lastIndex) });
  return parts;
}

export default function ChatPanel({ repoId }: { repoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function updateLastAssistant(update: Partial<Message>) {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...update };
      return next;
    });
  }

  async function handleSend() {
    const question = input.trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: question }, { role: "assistant", text: "" }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chat/${repoId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });

        const markerIdx = raw.indexOf(CITATIONS_MARKER);
        updateLastAssistant({ text: markerIdx >= 0 ? raw.slice(0, markerIdx) : raw });
      }

      const markerIdx = raw.indexOf(CITATIONS_MARKER);
      if (markerIdx >= 0) {
        try {
          const citations = JSON.parse(raw.slice(markerIdx + CITATIONS_MARKER.length)) as ChatCitation[];
          updateLastAssistant({ citations });
        } catch {
          // malformed trailer — leave text as-is, no citations
        }
      }
    } catch {
      updateLastAssistant({ text: "Something went wrong answering that — check the API terminal." });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col w-full h-[28rem] bg-card rounded-lg border border-border">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask a question about this codebase to get started.
          </p>
        )}

        {messages.map((m, idx) => {
          const isStreamingEmpty = sending && idx === messages.length - 1 && m.role === "assistant" && m.text === "";
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                  m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted text-foreground"
                }`}
              >
                {isStreamingEmpty ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : m.role === "assistant" ? (
                  <div className="flex flex-col gap-2">
                    {splitCodeFences(m.text).map((seg, i) =>
                      seg.type === "code" ? (
                        <CodeBlock key={i} code={seg.content} lang={seg.lang} />
                      ) : seg.content.trim() ? (
                        <p key={i} className="whitespace-pre-wrap">{seg.content}</p>
                      ) : null
                    )}
                  </div>
                ) : (
                  m.text
                )}
              </div>
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 max-w-[85%]">
                  {m.citations.map((c) => (
                    <Badge key={c.index} variant="outline" title={c.symbolName ?? ""}>
                      [{c.index}] {c.filePath}:{c.lines}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-border">
        <Input
          placeholder="Ask about this codebase..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>Send</Button>
      </div>
    </div>
  );
}