import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Placeholders keep the app from crashing on import when .env is missing;
// App.jsx shows a clear setup message instead.
export const supabase = createClient(url || "http://localhost:54321", anonKey || "missing-anon-key");
