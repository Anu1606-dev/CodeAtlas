import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import type { ChatResponse, ChatCitation } from "@codeatlas/shared";
import { apiPost } from "../lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CodeBlock from "./CodeBlock";
import { motion } from "motion/react";

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

  async function handleSend() {
    const question = input.trim();
    if (!question || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setSending(true);

    try {
      const result = await apiPost<ChatResponse>(`/api/chat/${repoId}`, { question });
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer, citations: result.citations }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong answering that — check the API terminal." }]);
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
    <div className="flex flex-col w-full h-112 bg-card rounded-lg border border-border">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask a question about this codebase to get started.
          </p>
        )}

        {messages.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted text-foreground"
                  }`}
              >
                {m.role === "assistant" ? (
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
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex items-start">
            <div className="rounded-lg px-3 py-2 bg-muted">
              <Loader2 className="animate-spin" size={16} />
            </div>
          </div>
        )}

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