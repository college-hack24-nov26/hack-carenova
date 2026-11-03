import { useEffect, useRef, useState } from "react";
import { askQuestion, profileSummary, screenText } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Markdown, Sources, Spinner } from "../components/ui.jsx";

const STORE_KEY = "fa_chat_history";

export default function Chatbot() {
  const { user } = useAuth();
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(history));
    } catch {
      /* ignore quota errors */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, busy]);

  async function send(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);

    let next = [...history, { role: "user", content: question }];
    setHistory(next);

    // 1) Emergency screen — always show a warning, but still retrieve guidance.
    let emergency = null;
    try {
      emergency = await screenText(question);
    } catch {
      emergency = null;
    }
    if (emergency?.emergency) {
      const warning =
        `🚨 Potential ${String(emergency.level || "urgent").toUpperCase()} warning.\n\n` +
        `${emergency.message || ""}\n\n` +
        "If someone may be in immediate danger, call 112 now. " +
        "This keyword screen is not a diagnosis and cannot rule out an emergency.";
      next = [...next, { role: "assistant", content: warning, sources: [], warning: true }];
      setHistory(next);
    }

    // 2) RAG answer (backend rewrites follow-ups using the last few turns).
    try {
      const recent = next
        .filter((m) => !m.warning && !m.error)
        .slice(-7, -1) // exclude the latest question itself
        .map(({ role, content }) => ({ role, content }));
      const { answer, sources } = await askQuestion(question, recent, profileSummary(user?.profile));
      setHistory([...next, { role: "assistant", content: String(answer), sources: sources || [] }]);
    } catch (exc) {
      setHistory([
        ...next,
        {
          role: "assistant",
          error: true,
          warning: true,
          sources: [],
          content:
            "I couldn't retrieve first-aid guidance. Check that your GROQ_API_KEY is set in .env, " +
            "your FAISS vector database exists, the backend is running, and the required packages " +
            `are installed. Technical details: ${exc.message}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-title">💬 Conversational First-Aid Assistant</div>
      <p className="caption">
        Ask a question and then ask follow-up questions. Conversation history is kept in this browser session.
      </p>
      <button
        className="btn"
        onClick={() => {
          setHistory([]);
          sessionStorage.removeItem(STORE_KEY);
        }}
      >
        🗑️ Clear chat
      </button>

      <div className="chat-box">
        {history.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-avatar">{m.role === "user" ? "🧑" : "🩺"}</div>
            <div className={`chat-bubble ${m.warning ? "warning" : ""}`}>
              {m.warning ? <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div> : <Markdown>{m.content}</Markdown>}
              <Sources sources={m.sources} />
            </div>
          </div>
        ))}
        {busy && <Spinner text="Searching the first-aid knowledge base..." />}
        <div ref={endRef} />
      </div>

      <form className="chat-input-bar" onSubmit={send}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a first-aid question..."
          disabled={busy}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </>
  );
}
