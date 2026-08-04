import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, User as UserIcon } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { renderMarkdown } from "../lib/markdown";

const STARTERS = [
  "What skills should I learn to become a Senior ML Engineer?",
  "Show me React Developer jobs in Bangalore",
  "How do I switch from QA to Backend Engineering?",
  "Frontend Engineer openings in Berlin",
];

export default function ChatPanel({
  sessionId,
  onSessionCreated,
  onMessageSent,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get(`/chat/sessions/${sessionId}`);
        setMessages(data);
      } catch {
        console.log("Failed to load messages");
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();

    if (!msg || loading) return;

    setInput("");

    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: msg,
    };

    setMessages((prev) => [...prev, optimistic]);
    setLoading(true);

    try {
      const { data } = await api.post("/chat/send", {
        session_id: sessionId || null,
        message: msg,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          jobs: data.jobs,
        },
      ]);

      if (!sessionId && data.session_id && onSessionCreated) {
        onSessionCreated(data.session_id);
      }

      onMessageSent?.();
    } catch (e) {
      toast.error(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          "Chat failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="max-w-3xl mx-auto px-6 pt-24 pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#1E1E1E] flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5" />
              </div>

              <h1 className="text-4xl sm:text-5xl tracking-tighter font-semibold">
                How can I help you today?
              </h1>

              <p className="text-[#A3A3A3] mt-3 max-w-xl">
                Ask anything about careers, resume analysis, or job search.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-12">
              {STARTERS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-left bg-[#141414] hover:bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}

            {loading && (
              <div className="flex gap-4 items-center">
                <Sparkles className="animate-pulse" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHAT INPUT */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-white/10 p-4 flex gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask something..."
          rows={1}
          className="flex-1 bg-[#141414] border border-white/10 rounded-xl p-3 resize-none outline-none focus:border-white/20"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-white text-black px-4 rounded-xl disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

function Message({ m }) {
  const isUser = m.role === "user";

  return (
    <div className="flex gap-4">
      <div>
        {isUser ? <UserIcon /> : <Sparkles />}
      </div>

      <div className="flex-1">
        {isUser ? (
          <div>{m.content}</div>
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(m.content),
            }}
          />
        )}
      </div>
    </div>
  );
}