import { useState } from "react";
import { evaluateAnswer } from "../api.js";
import { Alert, Field, Markdown, Sources, Spinner } from "../components/ui.jsx";

export default function Evaluation() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [warn, setWarn] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);

  async function run() {
    setWarn("");
    setError("");
    setOut(null);
    if (!question.trim()) return setWarn("Enter a question.");
    setLoading(true);
    try {
      setOut(await evaluateAnswer(question));
    } catch (exc) {
      setError(`Evaluation failed. Check Groq configuration and the FAISS database. Details: ${exc.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-title">📊 First-Aid Knowledge Evaluation</div>
      <p className="caption">
        Experimental LLM evaluation of relevance and faithfulness to retrieved text. It is not a
        clinical safety validation.
      </p>
      <Field label="Enter a first-aid question">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should I do for a minor cut?" />
      </Field>
      <button className="btn btn-primary" onClick={run} disabled={loading}>Generate and evaluate answer</button>

      {warn && <Alert kind="warning">{warn}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner text="Retrieving evidence and evaluating the answer..." />}

      {out && (
        <>
          <h3 style={{ marginTop: 18 }}>Generated answer</h3>
          <Markdown>{out.answer}</Markdown>
          <h3>Experimental evaluation</h3>
          <div style={{ whiteSpace: "pre-wrap" }}>{String(out.evaluation || "")}</div>
          <Sources sources={out.sources} />
        </>
      )}
    </>
  );
}
