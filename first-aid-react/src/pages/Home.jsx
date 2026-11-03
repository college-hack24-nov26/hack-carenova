import { useNavigate } from "react-router-dom";
import { Alert, CallButton } from "../components/ui.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const cards = [
  ["💬", "First-Aid Chatbot", "Ask questions, explore first-aid guidance and continue with follow-up questions.", "Ask the assistant", "/app/chatbot", "AI ASSISTANT"],
  ["🌍", "Multilingual Assistant", "Ask in English, Hindi or Marathi and receive guidance in your preferred language.", "Choose language", "/app/multilingual", "3 LANGUAGES"],
  ["🖼️", "Image Injury Assessment", "Upload an image to view a possible visual injury category and related guidance.", "Assess an image", "/app/image", "IMAGE AI"],
  ["🚨", "Emergency Contacts", "Save trusted contacts, call them, and prepare an emergency SMS.", "Manage contacts", "/app/contacts", "QUICK ACCESS"],
  ["🩺", "Symptom & Care Guidance", "Describe a situation and review conservative emergency-screening guidance.", "Review symptoms", "/app/symptoms", "QUICK SCREENING"],
  ["📚", "First-Aid Library", "Explore topics including burns, choking, bleeding, stroke and more.", "Browse library", "/app/library", "LEARN"],
  ["🏥", "Nearby Hospital Finder", "Search mapped hospitals around a city, locality or postcode.", "Find hospitals", "/app/hospitals", "LOCATION SEARCH"],
  ["📊", "Knowledge Evaluation", "Experimentally review an answer for relevance and faithfulness to retrieved sources.", "Evaluate answers", "/app/evaluation", "DEVELOPER TOOL"],
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <>
      <div className="hero">
        <div className="eyebrow">YOUR DIGITAL FIRST-AID COMPANION</div>
        <h1>Help starts with<br />the right next step.</h1>
        <p>
          {firstName ? `Welcome, ${firstName}. ` : ""}Access practical first-aid information, emergency
          screening, voice and multilingual support, injury-image assessment, and nearby hospital
          search — all from one place.
        </p>
      </div>
      <div className="trust-strip">
        ⚕️ <b>Important:</b> First Aid Guide AI is an educational prototype, not a medical diagnostic
        tool. For a life-threatening emergency in India, call <b>112</b> immediately.
      </div>

      <div className="section-heading">What do you need help with?</div>
      <div className="section-subtitle">
        Choose any tool below to open it directly. Every feature is accessible from this home page.
      </div>

      <div className="grid-3">
        {cards.map(([icon, title, description, buttonLabel, target, tag]) => (
          <div key={target}>
            <div className="feature-card">
              <div className="feature-icon">{icon}</div>
              <div className="feature-title">{title}</div>
              <div className="feature-description">{description}</div>
              <div className="feature-tag">{tag}</div>
            </div>
            <button className="btn btn-block" onClick={() => navigate(target)}>{buttonLabel}</button>
          </div>
        ))}
      </div>

      <hr className="divider" />
      <div className="split">
        <div>
          <h3>Built for clearer next steps</h3>
          <p>
            Use the knowledge assistant for educational information, the library to explore common
            first-aid topics, or the hospital finder to look up mapped facilities.
          </p>
        </div>
        <div>
          <h3>Emergency shortcut</h3>
          <Alert kind="error">
            If someone is unconscious, is not breathing normally, has severe bleeding, or may be in
            immediate danger, call 112 now.
          </Alert>
          <CallButton label="Call 112 now" block />
        </div>
      </div>
      <div className="footer-note">
        First Aid Guide AI · Educational prototype · Always follow emergency-dispatcher and qualified
        medical-professional instructions.
      </div>
    </>
  );
}
