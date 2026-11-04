import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { Alert, CallButton, Field, Spinner } from "../components/ui.jsx";
import { triggerPostEnquiryFollowup } from '../utils/notifications';

const PHONE_RE = /^\+?[0-9][0-9\s()-]{5,18}$/;
const clean = (p) => (p || "").replace(/[\s()-]/g, "");

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", relationship: "Family", phone: "" });
  const [msg, setMsg] = useState(null); // {kind, text}
  const [chosenIdx, setChosenIdx] = useState(0);
  const [situation, setSituation] = useState("");
  const [sms, setSms] = useState(null); // {message, phone}

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("id, name, relationship, phone")
      .order("created_at", { ascending: true });
    if (error) setMsg({ kind: "error", text: `Could not load contacts: ${error.message}` });
    else setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e) {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) return setMsg({ kind: "error", text: "Enter the contact's name." });
    if (!PHONE_RE.test(phone)) return setMsg({ kind: "error", text: "Enter a valid-looking phone number." });
    if (contacts.some((c) => c.phone === phone)) return setMsg({ kind: "warning", text: "This phone number is already saved." });
    const { error } = await supabase
      .from("emergency_contacts")
      .insert({ name, relationship: form.relationship, phone });
    if (error) return setMsg({ kind: "error", text: `Could not save contact: ${error.message}` });
    setForm({ name: "", relationship: "Family", phone: "" });
    setMsg({ kind: "success", text: "Contact added." });
    load();
  }

  async function remove(id) {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) return setMsg({ kind: "error", text: `Could not delete contact: ${error.message}` });
    setChosenIdx(0);
    setSms(null);
    load();
  }

  function prepare() {
    const selected = contacts[chosenIdx] || contacts[0];
    const message =
      `EMERGENCY ALERT\nHello ${selected.name || ""},\n` +
      `I may need assistance.\nSituation: ${situation.trim() || "Help needed"}\n` +
      "If there is immediate danger, contact emergency services.";
    setSms({ message, phone: clean(selected.phone) });

    // Trigger follow-up notification after user engages with emergency enquiry/alert
    triggerPostEnquiryFollowup();
  }

  return (
    <>
      <div className="page-title">🚨 Emergency Contact Center</div>
      <Alert kind="error">
        For a life-threatening emergency in India, call 112 immediately. Do not wait to prepare a message.
      </Alert>
      <CallButton label="📞 Call 112" />

      <form className="card" onSubmit={add} style={{ marginTop: 14 }}>
        <Field label="Contact name">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Relationship">
          <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
            {["Family", "Friend", "Guardian", "Doctor", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Phone number">
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <button className="btn btn-block" type="submit">Add emergency contact</button>
      </form>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <h3>Saved contacts</h3>
      {loading && <Spinner text="Loading contacts..." />}
      {!loading && contacts.length === 0 && <Alert kind="info">No contacts saved yet.</Alert>}
      {contacts.map((c) => (
        <div className="card" key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div><b>{c.name || "Contact"}</b> — {c.relationship || "Other"}</div>
            <div>{c.phone}</div>
            <div className="btn-row"><a className="btn" href={`tel:${clean(c.phone)}`}>Call contact</a></div>
          </div>
          <button className="btn btn-danger" onClick={() => remove(c.id)}>Delete</button>
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>Prepare an emergency alert</h3>
      {contacts.length > 0 ? (
        <>
          <Field label="Choose a contact">
            <select value={chosenIdx} onChange={(e) => setChosenIdx(Number(e.target.value))}>
              {contacts.map((c, i) => <option key={c.id} value={i}>{c.name} ({c.phone})</option>)}
            </select>
          </Field>
          <Field label="Describe the situation">
            <textarea value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="I need help because..." />
          </Field>
          <button className="btn" onClick={prepare}>Prepare SMS message</button>

          {sms && (
            <>
              <Field label="Review your message before sending">
                <textarea value={sms.message} disabled style={{ minHeight: 140 }} />
              </Field>
              <a className="btn" href={`sms:${sms.phone}?body=${encodeURIComponent(sms.message)}`}>Open SMS application</a>
              <div className="caption" style={{ marginTop: 8 }}>
                Your device/browser must support SMS links. You must review and send the message
                yourself; delivery is not confirmed.
              </div>
            </>
          )}
        </>
      ) : (
        !loading && <Alert kind="info">Add a trusted contact to prepare an alert.</Alert>
      )}
    </>
  );
}