import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const p = user.profile;

  const rows = [
    ["Name", p.fullName],
    ["Email", user.email],
    ["Age / sex", `${p.age || "—"} / ${p.sex || "—"}${p.sex === "Female" && p.pregnant === "Yes" ? " (pregnant)" : ""}`],
    ["Height / weight", `${p.heightCm || "—"} cm / ${p.weightKg || "—"} kg`],
    ["Blood group", p.bloodGroup],
    ["Language", p.language],
    ["Location", [p.city, p.pincode].filter(Boolean).join(" – ") || "—"],
    ["Conditions", [...(p.conditions || []), p.otherConditions].filter(Boolean).join(", ") || "None reported"],
    ["Blood thinners", p.onBloodThinners],
    ["Medicines", p.medications || "—"],
    ["Allergies", p.hasAllergies === "Yes" ? p.allergies : "None reported"],
    ["Implants / devices", p.implants || "—"],
    ["Surgeries / illnesses", p.surgeries || "—"],
    ["Mobility / disability", p.mobility],
    ["Last tetanus shot", p.tetanusLast],
    ["Smoking / alcohol", `${p.smoking} / ${p.alcohol}`],
    ["Emergency contact", `${p.emergencyName} (${p.emergencyRelation}) — ${p.emergencyPhone}`],
    ["Doctor", [p.doctorName, p.doctorPhone].filter(Boolean).join(" — ") || "—"],
    ["Insurance", p.insurance || "—"],
    ["Organ donor", p.organDonor],
  ];

  return (
    <>
      <div className="page-title">👤 My Health Profile</div>
      <p className="caption">
        This information is used as background context for guidance. Keep it up to date.
        {p.updatedAt && ` Last updated ${new Date(p.updatedAt).toLocaleString()}.`}
      </p>
      <div className="card">
        <table className="summary-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><td>{k}</td><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-primary" onClick={() => navigate("/health-profile")}>Edit profile</button>
    </>
  );
}
