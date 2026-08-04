
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

export default function ChatPanel({ sessionId, onSessionCreated, onMessageSent }) {
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
    setMessages((prev) => [...prev, {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: msg,
    }]);

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

      if (!sessionId && data.session_id) {
        onSessionCreated?.(data.session_id);
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
    <div className="flex flex-col h-full w-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">

        {empty ? (
          <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 md:pt-24 pb-8">

            <div className="flex flex-col items-center text-center">

              <div className="w-12 h-12 rounded-full bg-[#1E1E1E] flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5"/>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                How can I help you today?
              </h1>

              <p className="text-[#A3A3A3] mt-4 max-w-xl text-sm sm:text-base">
                Ask anything about careers, resume analysis or job search.
              </p>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
              {STARTERS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-left bg-[#141414] hover:bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 transition"
                >
                  {s}
                </button>
              ))}
            </div>

          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {messages.map((m) => (
              <Message key={m.id} m={m}/>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <Sparkles className="animate-pulse"/>
                <span>Thinking...</span>
              </div>
            )}
          </div>
        )}

      </div>

      <form
        onSubmit={(e)=>{
          e.preventDefault();
          send();
        }}
        className="border-t border-white/10 p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            rows={1}
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e)=>{
              if(e.key==="Enter" && !e.shiftKey){
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask something..."
            className="flex-1 bg-[#141414] border border-white/10 rounded-xl p-3 resize-none outline-none focus:border-white/20 min-h-[52px]"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-[52px] px-4 rounded-xl bg-white text-black disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="w-5 h-5"/>
          </button>
        </div>
      </form>
    </div>
  );
}

function Message({ m }) {
  const isUser = m.role === "user";

  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="shrink-0">
        {isUser ? <UserIcon/> : <Sparkles/>}
      </div>

      <div className="flex-1 break-words overflow-hidden">
        {isUser ? (
          <div className="whitespace-pre-wrap">{m.content}</div>
        ) : (
          <div
            className="prose prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(m.content),
            }}
          />
        )}
      </div>
    </div>
  );
}
