// Thin client for the FastAPI backend (backend/server.py) that runs your Python AI code
// (RAG chatbot, emergency screening, image model). Accounts, profiles and contacts
// live in Supabase instead (see src/supabaseClient.js).
import { supabase } from "./supabaseClient.js";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Supabase access token, sent so the API can verify who is calling it. */
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { ...(options.headers || {}), ...(await authHeader()) },
    });
  } catch {
    throw new Error(`Cannot reach the backend at ${BASE}. Is backend/server.py running?`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

const postJson = (path, body) =>
  request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Emergency keyword screen → {emergency, level, message, categories, disclaimer} */
export const screenText = (text) => postJson("/api/screen", { text });

/** RAG answer → {answer, sources:[{source_file, page_number}]}.
 *  history = [{role, content}] (backend rewrites follow-ups into standalone questions).
 *  profile = short text summary of the user's health profile (optional context). */
export const askQuestion = (question, history = [], profile = "") =>
  postJson("/api/chat", { question, history, profile });

/** Image classifier → {category, raw_prediction, score, needs_review} */
export const predictImage = (file) => {
  const form = new FormData();
  form.append("image", file);
  return request("/api/predict-image", { method: "POST", body: form });
};

/** Multilingual → {answer, sources, emergency} ; language: English | Hindi | Marathi */
export const multilingual = (question, language, profile = "") =>
  postJson("/api/multilingual", { question, language, profile });

/** Evaluation → {answer, evaluation, sources} */
export const evaluateAnswer = (question) => postJson("/api/evaluate", { question });

/** Turn the saved health profile into a compact text block for the LLM. */
export function profileSummary(p) {
  if (!p) return "";
  const parts = [];
  if (p.age) parts.push(`Age: ${p.age}`);
  if (p.sex) parts.push(`Sex: ${p.sex}`);
  if (p.pregnant === "Yes") parts.push("Currently pregnant");
  if (p.weightKg) parts.push(`Weight: ${p.weightKg} kg`);
  if (p.bloodGroup && p.bloodGroup !== "Unknown") parts.push(`Blood group: ${p.bloodGroup}`);
  if (p.conditions?.length) parts.push(`Conditions: ${p.conditions.join(", ")}`);
  if (p.otherConditions) parts.push(`Other conditions: ${p.otherConditions}`);
  if (p.onBloodThinners === "Yes") parts.push("Takes blood thinners");
  if (p.medications) parts.push(`Medications: ${p.medications}`);
  if (p.hasAllergies === "Yes" && p.allergies) parts.push(`Allergies: ${p.allergies}`);
  if (p.implants) parts.push(`Implants/devices: ${p.implants}`);
  if (p.mobility && p.mobility !== "None") parts.push(`Mobility/disability: ${p.mobility}`);
  return parts.join("; ");
}
