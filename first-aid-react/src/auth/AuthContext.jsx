import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient.js";

/*
 * Supabase-backed auth.
 *  - Accounts:        Supabase Auth (email + password)
 *  - Health profile:  public.profiles   (row per user, JSON in `health`)
 *  - Contacts:        public.emergency_contacts (see Contacts.jsx)
 * Row Level Security (supabase/schema.sql) makes sure users only touch their own rows.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profileRow, setProfileRow] = useState(null); // {full_name, health} | null
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Track the Supabase session.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthUser(data.session?.user ?? null);
      setSessionLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load the health profile whenever the signed-in user changes.
  useEffect(() => {
    if (!authUser) {
      setProfileRow(null);
      setProfileLoading(false);
      return;
    }
    let active = true;
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("full_name, health")
      .eq("id", authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfileRow(data ?? null);
        setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authUser]);

  const signup = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) return { ok: false, error: error.message };
    // With "Confirm email" enabled in Supabase there is no session until the link is clicked.
    if (!data.session) return { ok: true, needsConfirmation: true };
    return { ok: true };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const saveProfile = useCallback(
    async (profile) => {
      if (!authUser) return { ok: false, error: "Not signed in." };
      const health = { ...profile, updatedAt: new Date().toISOString() };
      const row = { id: authUser.id, full_name: profile.fullName || null, health, updated_at: health.updatedAt };
      const { error } = await supabase.from("profiles").upsert(row);
      if (error) return { ok: false, error: error.message };
      setProfileRow({ full_name: row.full_name, health });

      // First save: add the emergency contact from the form to the contacts list.
      if (profile.emergencyName && profile.emergencyPhone) {
        const { count } = await supabase
          .from("emergency_contacts")
          .select("id", { count: "exact", head: true });
        if (!count) {
          await supabase.from("emergency_contacts").insert({
            name: profile.emergencyName.trim(),
            relationship: profile.emergencyRelation || "Family",
            phone: profile.emergencyPhone.trim(),
          });
        }
      }
      return { ok: true };
    },
    [authUser]
  );

  const user = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      name: profileRow?.full_name || authUser.user_metadata?.full_name || "",
      profile: profileRow?.health || null,
    };
  }, [authUser, profileRow]);

  const loading = sessionLoading || profileLoading;
  const value = useMemo(
    () => ({ user, loading, signup, login, logout, saveProfile }),
    [user, loading, signup, login, logout, saveProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
