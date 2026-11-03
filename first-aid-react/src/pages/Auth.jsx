import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, Field } from "../components/ui.jsx";

export default function Auth({ mode }) {
  const isSignup = mode === "signup";
  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (isSignup) {
      if (!form.name.trim()) return setError("Enter your full name.");
      if (form.password.length < 8) return setError("Password must be at least 8 characters.");
      if (form.password !== form.confirm) return setError("Passwords do not match.");
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (!form.password) return setError("Enter your password.");

    setBusy(true);
    const result = isSignup
      ? await signup({ name: form.name, email: form.email, password: form.password })
      : await login({ email: form.email, password: form.password });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (result.needsConfirmation) {
      return setNotice("Account created. Check your email and click the confirmation link, then log in.");
    }
    // App.jsx redirects: no health profile yet → /health-profile, otherwise → /app
    navigate("/app", { replace: true });
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" style={{ textDecoration: "none" }}>
          <div className="brand-row">
            <div className="brand-mark">✚</div>
            <div className="brand-name">First Aid Guide <span>AI</span></div>
          </div>
        </Link>
        <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="caption">
          {isSignup
            ? "Next, you'll fill in a short health profile used to tailor first-aid guidance."
            : "Log in to continue to your first-aid tools."}
        </p>

        <form onSubmit={submit} noValidate>
          {isSignup && (
            <Field label="Full name">
              <input type="text" value={form.name} onChange={set("name")} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          </Field>
          <Field label="Password" hint={isSignup ? "At least 8 characters." : undefined}>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </Field>
          {isSignup && (
            <Field label="Confirm password">
              <input type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
            </Field>
          )}
          {error && <Alert kind="error">{error}</Alert>}
          {notice && <Alert kind="success">{notice}</Alert>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="auth-switch">
          {isSignup ? (
            <>Already have an account? <button onClick={() => navigate("/login")}>Log in</button></>
          ) : (
            <>New here? <button onClick={() => navigate("/signup")}>Create an account</button></>
          )}
        </div>
      </div>
    </div>
  );
}
