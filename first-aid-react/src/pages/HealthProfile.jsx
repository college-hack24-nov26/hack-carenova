import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, Field, RadioRow } from "../components/ui.jsx";

export const CONDITIONS = [
  "Diabetes",
  "High blood pressure",
  "Heart disease",
  "Asthma / COPD",
  "Epilepsy / seizures",
  "Previous stroke",
  "Kidney disease",
  "Bleeding / clotting disorder",
  "Thyroid disorder",
  "Cancer",
  "Weak immune system",
  "Mental health condition",
  "Anaemia",
  "Liver disease",
];

const BLOOD_GROUPS = ["Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STEPS = ["About you", "Medical history", "Medicines & allergies", "Emergency info"];
const PHONE_RE = /^\+?[0-9][0-9\s()-]{5,18}$/;

export const emptyProfile = {
  fullName: "", dob: "", age: "", sex: "", pregnant: "No",
  heightCm: "", weightKg: "", bloodGroup: "Unknown", language: "English",
  city: "", pincode: "",
  conditions: [], otherConditions: "", surgeries: "", implants: "", mobility: "None",
  smoking: "No", alcohol: "No",
  tetanusLast: "Not sure",
  hasAllergies: "No", allergies: "",
  onBloodThinners: "No", medications: "",
  emergencyName: "", emergencyRelation: "Family", emergencyPhone: "",
  doctorName: "", doctorPhone: "", insurance: "",
  organDonor: "Not sure",
  consent: false,
};

function ageFromDob(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

export default function HealthProfile() {
  const { user, saveProfile } = useAuth();
  const navigate = useNavigate();
  const editing = Boolean(user?.profile);
  const [data, setData] = useState({ ...emptyProfile, fullName: user?.name || "", ...(user?.profile || {}) });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const onInput = (k) => (e) => set(k, e.target.value);
  const toggleCondition = (c) =>
    set("conditions", data.conditions.includes(c) ? data.conditions.filter((x) => x !== c) : [...data.conditions, c]);

  function validate(s) {
    const e = {};
    if (s === 0) {
      if (!data.fullName.trim()) e.fullName = "Required";
      if (!data.dob) e.dob = "Required";
      else if (ageFromDob(data.dob) === "" || Number(ageFromDob(data.dob)) > 120) e.dob = "Enter a valid date of birth";
      if (!data.sex) e.sex = "Required";
      if (data.weightKg && (Number(data.weightKg) < 1 || Number(data.weightKg) > 400)) e.weightKg = "Enter a valid weight";
      if (data.heightCm && (Number(data.heightCm) < 30 || Number(data.heightCm) > 260)) e.heightCm = "Enter a valid height";
      if (data.pincode && !/^\d{6}$/.test(data.pincode)) e.pincode = "PIN code must be 6 digits";
    }
    if (s === 2) {
      if (data.hasAllergies === "Yes" && !data.allergies.trim()) e.allergies = "List the allergies";
    }
    if (s === 3) {
      if (!data.emergencyName.trim()) e.emergencyName = "Required";
      if (!PHONE_RE.test(data.emergencyPhone.trim())) e.emergencyPhone = "Enter a valid phone number";
      if (data.doctorPhone && !PHONE_RE.test(data.doctorPhone.trim())) e.doctorPhone = "Enter a valid phone number";
      if (!data.consent) e.consent = "Please confirm to continue";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => validate(step) && setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  async function submit(e) {
    e.preventDefault();
    if (!validate(3) || saving) return;
    setSaving(true);
    setSaveError("");
    const result = await saveProfile({ ...data, age: ageFromDob(data.dob) });
    setSaving(false);
    if (!result.ok) return setSaveError(`Could not save your profile: ${result.error}`);
    navigate("/app", { replace: true });
  }

  const age = ageFromDob(data.dob);

  return (
    <div className="profile-wrap">
      <div className="brand-row">
        <div className="brand-mark">✚</div>
        <div className="brand-name">First Aid Guide <span>AI</span></div>
      </div>
      <div className="step-label">Step {step + 1} of {STEPS.length} · {STEPS[step]}</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>
        {editing ? "Update your health profile" : "Tell us about your health"}
      </h1>
      <p className="caption">
        This helps tailor first-aid guidance (for example, blood thinners or allergies change what is
        safe). It is optional where marked, and it does not replace professional medical advice.
      </p>
      <div className="step-bar">
        {STEPS.map((_, i) => <div key={i} className={i <= step ? "done" : ""} />)}
      </div>

      <form className="profile-card" onSubmit={submit} noValidate>
        {step === 0 && (
          <div className="form-grid">
            <Field label="Full name *" error={errors.fullName} className="full">
              <input type="text" value={data.fullName} onChange={onInput("fullName")} />
            </Field>
            <Field label="Date of birth *" error={errors.dob} hint={age ? `Age: ${age} years` : undefined}>
              <input type="date" value={data.dob} max={new Date().toISOString().slice(0, 10)} onChange={onInput("dob")} />
            </Field>
            <Field label="Sex *" error={errors.sex}>
              <select value={data.sex} onChange={onInput("sex")}>
                <option value="">Select…</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </Field>
            {data.sex === "Female" && (
              <Field label="Currently pregnant?" className="full">
                <RadioRow name="pregnant" value={data.pregnant} options={["No", "Yes", "Not sure"]} onChange={(v) => set("pregnant", v)} />
              </Field>
            )}
            <Field label="Height (cm)" error={errors.heightCm}>
              <input type="number" value={data.heightCm} onChange={onInput("heightCm")} />
            </Field>
            <Field label="Weight (kg)" error={errors.weightKg} hint="Used for safe medicine-dose context">
              <input type="number" value={data.weightKg} onChange={onInput("weightKg")} />
            </Field>
            <Field label="Blood group">
              <select value={data.bloodGroup} onChange={onInput("bloodGroup")}>
                {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Preferred language">
              <select value={data.language} onChange={onInput("language")}>
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
              </select>
            </Field>
            <Field label="City / locality">
              <input type="text" value={data.city} onChange={onInput("city")} placeholder="e.g. Phaltan" />
            </Field>
            <Field label="PIN code" error={errors.pincode}>
              <input type="text" inputMode="numeric" maxLength={6} value={data.pincode} onChange={onInput("pincode")} placeholder="415523" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <>
            <Field label="Do you have any of these conditions? (select all that apply)">
              <div className="check-grid">
                {CONDITIONS.map((c) => (
                  <label key={c}>
                    <input type="checkbox" checked={data.conditions.includes(c)} onChange={() => toggleCondition(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Other medical conditions">
              <textarea value={data.otherConditions} onChange={onInput("otherConditions")} />
            </Field>
            <div className="form-grid">
              <Field label="Past surgeries / major illnesses">
                <textarea value={data.surgeries} onChange={onInput("surgeries")} />
              </Field>
              <Field label="Implants or devices" hint="e.g. pacemaker, stent, insulin pump, joint replacement">
                <textarea value={data.implants} onChange={onInput("implants")} />
              </Field>
              <Field label="Mobility, hearing, vision or other disability">
                <select value={data.mobility} onChange={onInput("mobility")}>
                  <option>None</option>
                  <option>Uses wheelchair / walking aid</option>
                  <option>Hearing impairment</option>
                  <option>Vision impairment</option>
                  <option>Speech difficulty</option>
                  <option>Cognitive / memory difficulty</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Last tetanus shot" hint="Relevant for cuts, wounds and burns">
                <select value={data.tetanusLast} onChange={onInput("tetanusLast")}>
                  <option>Not sure</option>
                  <option>Within last 5 years</option>
                  <option>5–10 years ago</option>
                  <option>More than 10 years ago</option>
                  <option>Never</option>
                </select>
              </Field>
              <Field label="Do you smoke or use tobacco?">
                <RadioRow name="smoking" value={data.smoking} options={["No", "Yes"]} onChange={(v) => set("smoking", v)} />
              </Field>
              <Field label="Do you drink alcohol regularly?">
                <RadioRow name="alcohol" value={data.alcohol} options={["No", "Yes"]} onChange={(v) => set("alcohol", v)} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Do you have any allergies?">
              <RadioRow name="hasAllergies" value={data.hasAllergies} options={["No", "Yes"]} onChange={(v) => set("hasAllergies", v)} />
            </Field>
            {data.hasAllergies === "Yes" && (
              <Field label="List allergies and reactions *" error={errors.allergies} hint="Medicines (e.g. penicillin), foods, insect stings, latex, etc.">
                <textarea value={data.allergies} onChange={onInput("allergies")} />
              </Field>
            )}
            <Field label="Do you take blood thinners (e.g. aspirin, warfarin, clopidogrel)?" hint="Important for bleeding first aid">
              <RadioRow name="onBloodThinners" value={data.onBloodThinners} options={["No", "Yes", "Not sure"]} onChange={(v) => set("onBloodThinners", v)} />
            </Field>
            <Field label="Regular medicines (name and dose, if known)">
              <textarea value={data.medications} onChange={onInput("medications")} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h3>Emergency contact *</h3>
            <div className="form-grid-3">
              <Field label="Name" error={errors.emergencyName}>
                <input type="text" value={data.emergencyName} onChange={onInput("emergencyName")} />
              </Field>
              <Field label="Relationship">
                <select value={data.emergencyRelation} onChange={onInput("emergencyRelation")}>
                  <option>Family</option><option>Friend</option><option>Guardian</option><option>Doctor</option><option>Other</option>
                </select>
              </Field>
              <Field label="Phone number" error={errors.emergencyPhone}>
                <input type="tel" value={data.emergencyPhone} onChange={onInput("emergencyPhone")} />
              </Field>
            </div>
            <h3 style={{ marginTop: 8 }}>Doctor & insurance (optional)</h3>
            <div className="form-grid-3">
              <Field label="Family doctor">
                <input type="text" value={data.doctorName} onChange={onInput("doctorName")} />
              </Field>
              <Field label="Doctor's phone" error={errors.doctorPhone}>
                <input type="tel" value={data.doctorPhone} onChange={onInput("doctorPhone")} />
              </Field>
              <Field label="Health insurance / scheme">
                <input type="text" value={data.insurance} onChange={onInput("insurance")} />
              </Field>
            </div>
            <Field label="Organ donor?">
              <RadioRow name="organDonor" value={data.organDonor} options={["Yes", "No", "Not sure"]} onChange={(v) => set("organDonor", v)} />
            </Field>

            <Alert kind="info">
              Your answers are saved to your account. The emergency contact you enter here is added
              to your Emergency Contacts list.
            </Alert>
            <Field error={errors.consent}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
                <input type="checkbox" checked={data.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 4 }} />
                I confirm the information is accurate to the best of my knowledge and I understand this app
                is an educational prototype that cannot diagnose or replace professional medical care.
              </label>
            </Field>
          </>
        )}

        {saveError && <Alert kind="error">{saveError}</Alert>}
        <div className="btn-row" style={{ justifyContent: "space-between", marginTop: 18 }}>
          <div>
            {step > 0 && <button type="button" className="btn" onClick={back}>← Back</button>}
            {editing && step === 0 && <button type="button" className="btn" onClick={() => navigate("/app/profile")}>Cancel</button>}
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={next}>Continue →</button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Save profile & continue"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
