import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ChatResponse, ChatCitation } from "@codeatlas/shared";
import { apiPost } from "../lib/api";

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer, citations: result.citations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong answering that — check the API terminal." },
      ]);
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
    <div className="flex flex-col w-full h-112 bg-base-100 rounded-box border border-base-300">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-sm opacity-60 text-center mt-8">
            Ask a question about this codebase to get started.
          </p>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`chat ${m.role === "user" ? "chat-end" : "chat-start"}`}>
            <div
              className={`chat-bubble whitespace-pre-wrap text-sm ${
                m.role === "user" ? "chat-bubble-primary" : ""
              }`}
            >
              {m.text}
            </div>
            {m.citations && m.citations.length > 0 && (
              <div className="chat-footer flex flex-wrap gap-1 mt-1">
                {m.citations.map((c) => (
                  <span
                    key={c.index}
                    className="badge badge-outline badge-sm"
                    title={c.symbolName ?? ""}
                  >
                    [{c.index}] {c.filePath}:{c.lines}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="chat chat-start">
            <div className="chat-bubble">
              <span className="loading loading-dots loading-sm" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-base-300">
        <input
          type="text"
          className="input input-bordered input-sm flex-1"
          placeholder="Ask about this codebase..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSend}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}