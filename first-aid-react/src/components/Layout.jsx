import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, CallButton } from "./ui.jsx";

export const sections = [
  { path: "/app", label: "🏠 Home", end: true },
  { path: "/app/chatbot", label: "💬 First-Aid Chatbot" },
  { path: "/app/symptoms", label: "🩺 Symptom & Care Guidance" },
  { path: "/app/image", label: "🖼️ Image Injury Assessment" },
  { path: "/app/multilingual", label: "🌍 Multilingual Assistant" },
  { path: "/app/library", label: "📚 First-Aid Library" },
  { path: "/app/hospitals", label: "🏥 Nearby Hospital Finder" },
  { path: "/app/contacts", label: "🚨 Emergency Contacts" },
  { path: "/app/evaluation", label: "📊 Knowledge Evaluation" },
  { path: "/app/profile", label: "👤 My Health Profile" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <h2>✚ First Aid Guide AI</h2>
        <div className="caption">Your first-response companion</div>
        <hr />
        <nav className="nav-list">
          {sections.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              end={s.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
        <hr />
        <div className="side-label">LANGUAGES</div>
        <div className="caption">English · हिंदी · मराठी</div>
        <div className="side-label">SAFETY FIRST</div>
        <div className="caption">Educational support only. This app cannot diagnose or rule out an emergency.</div>
        <a className="btn btn-block" href="tel:112">📞 Emergency services · 112</a>

        <div className="sidebar-user">
          <div className="user-chip">
            <b>{user?.name}</b>
            {user?.email}
          </div>
          <button
            className="btn btn-block"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
          <button className="btn menu-toggle" onClick={() => setOpen(true)}>☰ Menu</button>

          <div className="brand-row">
            <div className="brand-mark">✚</div>
            <div>
              <div className="brand-name">First Aid Guide <span>AI</span></div>
              <div className="brand-tag">SMARTER FIRST RESPONSE · CLEARER NEXT STEPS</div>
            </div>
          </div>

          <Alert kind="error">
            🚨 LIFE-THREATENING EMERGENCY? Call 112 in India immediately. Do not wait for this app,
            an AI answer, or an image assessment.
          </Alert>
          <CallButton />

          <Outlet />

          <hr className="divider" />
          <div className="caption">
            First Aid Guide AI is an educational prototype, not a diagnosis or a substitute for
            professional medical care. Emergency screening may miss emergencies. In India, call 112
            for life-threatening emergencies.
          </div>
        </div>
      </main>
    </div>
  );
}
