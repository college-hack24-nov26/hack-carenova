import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../components/ui.jsx";

const highlights = [
  ["💬", "First-Aid Chatbot", "Ask questions and follow-ups, answered from a first-aid knowledge base."],
  ["🌍", "Multilingual", "English, हिंदी and मराठी support."],
  ["🖼️", "Image Assessment", "Upload an injury image for a possible visual category and guidance."],
  ["🏥", "Hospital Finder", "Search hospitals in the Phaltan Taluka dataset."],
  ["🚨", "Emergency Contacts", "Save trusted contacts and prepare an emergency SMS."],
  ["📚", "First-Aid Library", "Burns, choking, bleeding, stroke and more."],
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <>
      <div className="landing-nav">
        <div className="brand-row" style={{ margin: 0 }}>
          <div className="brand-mark">✚</div>
          <div>
            <div className="brand-name">First Aid Guide <span>AI</span></div>
            <div className="brand-tag">SMARTER FIRST RESPONSE · CLEARER NEXT STEPS</div>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <Link className="btn" to="/signup">Create account</Link>
          <button className="btn btn-primary" onClick={() => navigate("/login")}>Log in</button>
        </div>
      </div>

      <div className="landing-wrap">
        <Alert kind="error">
          🚨 LIFE-THREATENING EMERGENCY? Call 112 in India immediately. Do not wait for this app,
          an AI answer, or an image assessment.
        </Alert>
        <a className="btn" href="tel:112">📞 Call Emergency Number 112</a>

        <div className="hero" style={{ marginTop: 18 }}>
          <div className="eyebrow">YOUR DIGITAL FIRST-AID COMPANION</div>
          <h1>Help starts with<br />the right next step.</h1>
          <p>
            Access practical first-aid information, emergency screening, voice and multilingual
            support, injury-image assessment, and nearby hospital search — all from one place.
          </p>
          <div className="btn-row" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => navigate("/signup")}>Get started</button>
            <button className="btn" onClick={() => navigate("/login")}>Log in</button>
          </div>
        </div>

        <div className="trust-strip">
          ⚕️ <b>Important:</b> First Aid Guide AI is an educational prototype, not a medical diagnostic
          tool. For a life-threatening emergency in India, call <b>112</b> immediately.
        </div>

        <div className="section-heading">What you get</div>
        <div className="section-subtitle">
          Create a free account and fill in a short health profile so guidance can be tailored to you.
        </div>
        <div className="grid-3">
          {highlights.map(([icon, title, desc]) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon">{icon}</div>
              <div className="feature-title">{title}</div>
              <div className="feature-description">{desc}</div>
            </div>
          ))}
        </div>

        <div className="footer-note">
          First Aid Guide AI · Educational prototype · Always follow emergency-dispatcher and
          qualified medical-professional instructions.
        </div>
      </div>
    </>
  );
}
