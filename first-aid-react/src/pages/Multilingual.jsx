import { useState } from "react";
import { multilingual, profileSummary } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, Field, Markdown, Sources, Spinner } from "../components/ui.jsx";

// Display label → language name sent to the backend
const LANGUAGES = [
  { label: "English", value: "English" },
  { label: "हिंदी", value: "Hindi" },
  { label: "मराठी", value: "Marathi" },
];

export default function Multilingual() {
  const { user } = useAuth();
  const preferred = user?.profile?.language;
  const [language, setLanguage] = useState(LANGUAGES.find((l) => l.value === preferred)?.value || "English");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [warn, setWarn] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);

  async function submit() {
    setWarn("");
    setError("");
    setOut(null);
    if (!question.trim()) return setWarn("Enter a question.");
    setLoading(true);
    try {
      setOut(await multilingual(question, language, profileSummary(user?.profile)));
    } catch (exc) {
      setError(`Multilingual response failed: ${exc.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-title">🌍 Multilingual First-Aid Assistant</div>
      <Field label="Preferred answer language">
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </Field>
      <Field label="Enter your question">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Describe the injury or emergency..."
        />
      </Field>
      <button className="btn btn-primary" onClick={submit} disabled={loading}>Get multilingual guidance</button>

      {warn && <Alert kind="warning">{warn}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner text="Translating, retrieving guidance and preparing the answer..." />}

      {out && (
        <>
          {out.emergency?.emergency && (
            <>
              <Alert kind="error">Potential emergency warning: {String(out.emergency.message || "")}</Alert>
              <Alert kind="error">For a life-threatening emergency in India, call 112 immediately.</Alert>
            </>
          )}
          <Markdown>{out.answer}</Markdown>
          <Sources sources={out.sources} />
        </>
      )}
    </>
  );
}
