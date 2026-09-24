import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import type { ChatResponse, ChatCitation } from "@codeatlas/shared";
import { apiPost } from "../lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: ChatCitation[];
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
          <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap max-w-[85%] ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {m.text}
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