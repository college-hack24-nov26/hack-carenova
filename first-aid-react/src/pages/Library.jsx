import { useState } from "react";
import { askQuestion, profileSummary } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { libraryTopics } from "../data/libraryTopics.js";
import { Alert, Markdown, Sources, Spinner } from "../components/ui.jsx";

export default function Library() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = Object.entries(libraryTopics).filter(
    ([name, d]) => name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
  );

  async function load() {
    const details = libraryTopics[selected];
    setLoading(true);
    setError("");
    setOut(null);
    try {
      const { answer, sources } = await askQuestion(
        `${details.question} Use the First Aid Guide knowledge base. Give clear immediate steps, ` +
          "what not to do, warning signs and when to seek professional care. " +
          "Do not diagnose. If the retrieved source is insufficient, say so. " +
          "For life-threatening emergencies in India, tell the user to call 112.",
        [],
        profileSummary(user?.profile)
      );
      setOut({ answer, sources });
    } catch (exc) {
      setError(
        "Unable to retrieve the guide. Check your GROQ_API_KEY, FAISS database and required " +
          `dependencies. Details: ${exc.message}`
      );
    } finally {
      setLoading(false);
    }
  }

  const details = selected ? libraryTopics[selected] : null;

  return (
    <>
      <div className="page-title">📚 First-Aid Library</div>
      <p className="caption">
        Choose a predefined topic below to retrieve relevant guidance from your First Aid Guide knowledge base.
      </p>
      <div className="field">
        <label>🔎 Search First Aid Library</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search burns, choking, snakebite..."
        />
      </div>

      <hr className="divider" />
      <h2>Explore First-Aid Topics</h2>

      {filtered.length === 0 ? (
        <Alert kind="info">No matching topics found. Try a different search.</Alert>
      ) : (
        <div className="grid-3">
          {filtered.map(([topic, d]) => (
            <div className="card" key={topic}>
              <h3>{d.icon} {topic}</h3>
              <p>{d.description}</p>
              <button
                className="btn btn-block"
                onClick={() => {
                  setSelected(topic);
                  setOut(null);
                  setError("");
                }}
              >
                View Guide
              </button>
            </div>
          ))}
        </div>
      )}

      {details && (
        <>
          <hr className="divider" />
          <h2>{details.icon} {selected}</h2>
          <p className="caption">Guidance is retrieved from your First Aid Guide knowledge base.</p>
          <button className="btn btn-primary" onClick={load} disabled={loading}>Load first-aid instructions</button>
          {loading && <Spinner text={`Retrieving guidance for ${selected}...`} />}
          {error && <Alert kind="error">{error}</Alert>}
          {out && (
            <>
              <Markdown>{out.answer}</Markdown>
              <Sources sources={out.sources} />
            </>
          )}
        </>
      )}
    </>
  );
}
