import { useEffect, useState } from "react";
import { askQuestion, predictImage, profileSummary, screenText } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, Field, Markdown, Sources, Spinner } from "../components/ui.jsx";

export default function ImageAssess() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState("");
  const [warn, setWarn] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function assess() {
    setWarn("");
    setError("");
    setOut(null);
    if (!file) return setWarn("Please upload an image.");

    try {
      setLoading("Analyzing the image...");
      const result = await predictImage(file);
      const category = result.category;
      const raw = result.raw_prediction || "Uncertain";
      const score = Number(result.score || 0);
      const needsReview = Boolean(result.needs_review);

      let emergency = null;
      if (symptoms.trim()) {
        try {
          emergency = await screenText(symptoms);
        } catch {
          emergency = null;
        }
      }
      setOut({ category, raw, score, needsReview, emergency });

      setLoading("Retrieving guidance from the first-aid knowledge base...");
      const query =
        `Provide first-aid guidance for a possible visual injury category: ${category || raw}. ` +
        `User's description: ${symptoms.trim() || "No additional symptoms provided."} ` +
        "Use the First Aid Guide knowledge base. Give simple, conservative steps, what not to do, " +
        "and when to seek professional care. Do not diagnose; state if the retrieved source is insufficient.";
      const { answer, sources } = await askQuestion(query, [], profileSummary(user?.profile));
      setOut((o) => ({ ...o, answer, sources }));
    } catch (exc) {
      setError(
        "Image assessment failed. Check that models/injury_classifier.keras, models/class_names.json, " +
          `TensorFlow and Pillow are available. Details: ${exc.message}`
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <>
      <div className="page-title">🖼️ Image-Based Injury Assessment</div>
      <Alert kind="warning">
        The image model can be wrong. Its score is a model score, not a medical probability or
        diagnosis. Do not use an image prediction to decide whether emergency care is needed.
      </Alert>

      <Field label="Upload an injury image">
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </Field>
      {preview && <img src={preview} alt="Uploaded injury" style={{ maxWidth: 320, borderRadius: 12, marginBottom: 12 }} />}

      <Field label="Describe symptoms or how the injury happened">
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="For example: when it happened, pain, bleeding, or swelling..."
        />
      </Field>
      <button className="btn btn-primary" onClick={assess} disabled={!!loading}>Assess image</button>

      {warn && <Alert kind="warning">{warn}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner text={loading} />}

      {out && (
        <>
          <h3 style={{ marginTop: 18 }}>Possible visual category</h3>
          {out.needsReview || !out.category ? (
            <Alert kind="warning">
              Prediction uncertain. The model's top category was <b>{out.raw}</b>, but it should not be relied on.
            </Alert>
          ) : (
            <p><b>{out.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</b></p>
          )}
          <div className="metric" style={{ maxWidth: 360 }}>
            <div className="label">Model score (not a medical probability)</div>
            <div className="value">{(out.score * 100).toFixed(1)}%</div>
          </div>
          <div className="caption">
            This model score is not clinically validated and does not measure injury severity.
          </div>

          {out.emergency?.emergency && (
            <>
              <Alert kind="error">Potential emergency warning: {String(out.emergency.message || "")}</Alert>
              <Alert kind="error">For a life-threatening emergency in India, call 112.</Alert>
            </>
          )}

          {out.answer && (
            <>
              <h3>First-aid guidance</h3>
              <Markdown>{out.answer}</Markdown>
              <Sources sources={out.sources} />
            </>
          )}
        </>
      )}
    </>
  );
}
