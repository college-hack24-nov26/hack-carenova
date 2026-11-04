import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { supabaseConfigured } from "./supabaseClient.js";
import Layout from "./components/Layout.jsx";
import { Alert, Spinner } from "./components/ui.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import HealthProfile from "./pages/HealthProfile.jsx";
import Home from "./pages/Home.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import Symptoms from "./pages/Symptoms.jsx";
import ImageAssess from "./pages/ImageAssess.jsx";
import Multilingual from "./pages/Multilingual.jsx";
import Library from "./pages/Library.jsx";
import Hospitals from "./pages/Hospitals.jsx";
import Contacts from "./pages/Contacts.jsx";
import Evaluation from "./pages/Evaluation.jsx";
import Profile from "./pages/Profile.jsx";
import { useEffect } from "react";
import { requestNotificationPermission, checkHealthCheckupSchedule } from "./utils/notifications";

/** Logged-out → /login ; logged-in without a health profile → /health-profile */
function RequireAccount({ children, needProfile = true }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (needProfile && !user.profile) return <Navigate to="/health-profile" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  // Initialize notifications and 2-month checkup reminders on app mount
  useEffect(() => {
    requestNotificationPermission();
    checkHealthCheckupSchedule();
  }, []);

  if (!supabaseConfigured) {
    return (
      <div className="profile-wrap">
        <Alert kind="error">
          <p><b>Supabase is not configured.</b></p>
          <p>
            Copy <code>.env.example</code> to <code>.env</code>, set <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> (Supabase → Project Settings → API), then restart{" "}
            <code>npm run dev</code>.
          </p>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-wrap">
        <Spinner text="Loading your account..." />
      </div>
    );
  }

  const afterAuth = user ? (user.profile ? "/app" : "/health-profile") : null;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={afterAuth ? <Navigate to={afterAuth} replace /> : <Auth mode="login" />} />
      <Route path="/signup" element={afterAuth ? <Navigate to={afterAuth} replace /> : <Auth mode="signup" />} />
      <Route
        path="/health-profile"
        element={
          <RequireAccount needProfile={false}>
            <HealthProfile />
          </RequireAccount>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAccount>
            <Layout />
          </RequireAccount>
        }
      >
        <Route index element={<Home />} />
        <Route path="chatbot" element={<Chatbot />} />
        <Route path="symptoms" element={<Symptoms />} />
        <Route path="image" element={<ImageAssess />} />
        <Route path="multilingual" element={<Multilingual />} />
        <Route path="library" element={<Library />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="evaluation" element={<Evaluation />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}