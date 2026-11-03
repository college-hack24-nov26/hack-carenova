import { useState } from "react";
import { askQuestion, profileSummary, screenText } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, Field, Markdown, RadioRow, Sources, Spinner } from "../components/ui.jsx";

export default function Symptoms() {
  const { user } = useAuth();
  const [situation, setSituation] = useState("");
  const [breathing, setBreathing] = useState("Not sure");
  const [responsive, setResponsive] = useState("Not sure");
  const [worsening, setWorsening] = useState("Not sure");
  const [state, setState] = useState({ warn: false, result: null, screenError: "", guidance: null, guidanceError: "", loading: "" });

  async function run(withGuidance) {
    if (!situation.trim()) {
      setState({ warn: true, result: null, screenError: "", guidance: null, guidanceError: "", loading: "" });
      return;
    }
    let screeningText = situation.trim();
    if (breathing === "No") screeningText += " The person is not breathing normally.";
    if (responsive === "No") screeningText += " The person is unresponsive.";
    if (worsening === "Yes") screeningText += " The symptoms are severe or worsening.";

    setState({ warn: false, result: null, screenError: "", guidance: null, guidanceError: "", loading: "screen" });

    let result = null;
    let screenError = "";
    try {
      result = await screenText(screeningText);
    } catch (exc) {
      screenError = `Emergency screening module could not be loaded: ${exc.message}`;
    }
    setState((s) => ({ ...s, result, screenError, loading: withGuidance ? "rag" : "" }));

    if (withGuidance) {
      try {
        const profile = profileSummary(user?.profile);
        const { answer, sources } = await askQuestion(
          "Reported symptoms or injury: " + screeningText +
            "\nProvide relevant first-aid guidance grounded in the First Aid Guide source. " +
            "Do not diagnose. Include actions to avoid and when to seek professional care.",
          [],
          profile
        );
        setState((s) => ({ ...s, guidance: { answer, sources }, loading: "" }));
      } catch (exc) {
        setState((s) => ({ ...s, guidanceError: `Could not retrieve guidance: ${exc.message}`, loading: "" }));
      }
    }
  }

  const { result } = state;
  let banner = null;
  if (result) {
    if (breathing === "No" || responsive === "No" || (result.emergency && result.level === "critical")) {
      banner = <Alert kind="error">🔴 POTENTIAL LIFE-THREATENING EMERGENCY — Call 112 immediately and follow the call handler's instructions.</Alert>;
    } else if (result.emergency || worsening === "Yes" || breathing === "Not sure" || responsive === "Not sure") {
      banner = <Alert kind="warning">🟠 Prompt professional assessment may be needed. If the person deteriorates or may be in immediate danger, call 112.</Alert>;
    } else {
      banner = <Alert kind="info">⚠️ No critical emergency pattern was identified. This is NOT an all-clear; seek medical advice if symptoms persist, worsen or concern you.</Alert>;
    }
  }

  return (
    <>
      <div className="page-title">🩺 Symptom Assessment & Professional Care Guidance</div>
      <p>Describe the situation. This is conservative keyword screening, not medical triage or diagnosis.</p>

      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <Field label="Describe symptoms or injury">
          <textarea
            style={{ minHeight: 130 }}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Describe what happened, symptoms and when they began..."
          />
        </Field>
        <Field label="Is the person breathing normally?">
          <select value={breathing} onChange={(e) => setBreathing(e.target.value)}>
            <option>Not sure</option><option>Yes</option><option>No</option>
          </select>
        </Field>
        <Field label="Is the person awake and responding normally?">
          <select value={responsive} onChange={(e) => setResponsive(e.target.value)}>
            <option>Not sure</option><option>Yes</option><option>No</option>
          </select>
        </Field>
        <Field label="Are symptoms severe, sudden, or getting worse?">
          <RadioRow name="worsening" value={worsening} options={["Not sure", "No", "Yes"]} onChange={setWorsening} />
        </Field>
        <button type="button" className="btn btn-block" disabled={!!state.loading} onClick={() => run(false)}>
          Assess care guidance
        </button>
        <div style={{ height: 8 }} />
        <button type="button" className="btn btn-block" disabled={!!state.loading} onClick={() => run(true)}>
          Assess and retrieve first-aid guidance
        </button>
      </form>

      {state.warn && <Alert kind="warning">Describe the situation. If someone may be in immediate danger, call 112.</Alert>}
      {state.loading === "screen" && <Spinner text="Screening..." />}
      {state.screenError && <Alert kind="error">{state.screenError}</Alert>}

      {result && (
        <>
          {banner}
          <p>{result.message}</p>
          <div className="caption">
            {result.disclaimer || "Keyword screening is incomplete and cannot rule out an emergency."}
          </div>
          <details className="expander">
            <summary>Screening details</summary>
            <p>Detected categories: {JSON.stringify(result.categories || [])}</p>
          </details>
          <h4>Recommended next steps</h4>
          <ul>
            <li>Follow appropriate first-aid instructions from a reliable source.</li>
            <li>Seek professional assessment for serious, persistent or worsening symptoms.</li>
            <li>Do not delay emergency assistance.</li>
          </ul>
        </>
      )}

      {state.loading === "rag" && <Spinner text="Retrieving relevant first-aid guidance..." />}
      {state.guidance && (
        <>
          <Markdown>{state.guidance.answer}</Markdown>
          <Sources sources={state.guidance.sources} />
        </>
      )}
      {state.guidanceError && <Alert kind="error">{state.guidanceError}</Alert>}
    </>
  );
}
