# First Aid Guide AI — React + Supabase

React (Vite) version of your Streamlit `app.py`, with **accounts, health profiles and emergency contacts stored in Supabase**.

```
first-aid-react/
├── index.html · package.json · vite.config.js
├── .env.example               → copy to .env
├── public/                    → put phaltan_taluka_hospitals.csv here
├── supabase/schema.sql        → tables + Row Level Security (run once)
├── backend/server.py          → FastAPI wrapper for your existing Python AI modules
└── src/
    ├── main.jsx · App.jsx · styles.css · api.js · supabaseClient.js
    ├── auth/AuthContext.jsx   (Supabase sign-up / log-in / profile save)
    ├── components/            (Layout sidebar, shared UI)
    ├── data/libraryTopics.js
    └── pages/                 Landing, Auth, HealthProfile, Home, Chatbot, Symptoms,
                               ImageAssess, Multilingual, Library, Hospitals, Contacts,
                               Evaluation, Profile
```

## How the pieces fit

| Concern | Where it lives |
|---|---|
| Accounts / login | **Supabase Auth** (email + password) |
| Health profile | **Supabase** table `profiles` (`health` JSON column) |
| Emergency contacts | **Supabase** table `emergency_contacts` |
| RAG chatbot, emergency screening, image model, translation | **Your Python code** via `backend/server.py` (FAISS, Groq and TensorFlow cannot run inside Supabase) |
| Hospital list | `public/phaltan_taluka_hospitals.csv`, parsed in the browser |

## User flow

1. `/` public landing page → **Log in** / **Create account**
2. `/signup` or `/login`
3. `/health-profile` — 4-step form, required once after sign-up
4. `/app/...` — all 9 sections + **My Health Profile** (view/edit)

---

## Step-by-step setup

### Step 1 — Create the Supabase tables
1. Open your project at https://supabase.com/dashboard.
2. **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, click **Run**.
   This creates `profiles` and `emergency_contacts` and turns on Row Level Security so each user can read and change **only their own rows**.

### Step 2 — Configure Auth
**Authentication → Providers → Email** is on by default.
- **Easiest for testing:** turn **Confirm email** OFF, so users get in right after signing up.
- **For production:** keep it ON. The app then shows "check your email" after sign-up. Set **Authentication → URL Configuration → Site URL** to your site address.

### Step 3 — Get your keys
**Project Settings → API** → copy the **Project URL** and the **anon public** key. (Never put the `service_role` key in the frontend.)

### Step 4 — Install and configure the frontend
```bash
cd first-aid-react
npm install
cp .env.example .env          # Windows: copy .env.example .env
```
Edit `.env`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```
Copy `phaltan_taluka_hospitals.csv` into `public/`.

### Step 5 — Run the Python AI API
1. Copy `backend/server.py` into your **original Python project folder** (beside `create_memory_with_llm.py`, `emergency_detection.py`, `predict_image.py`, `.env`).
2. `pip install fastapi "uvicorn[standard]" python-multipart requests`
3. `uvicorn server:app --reload --port 8000`
4. Check http://localhost:8000/api/health → `{"status":"ok"}`

*(Optional) lock the API to logged-in users:* add to the Python `.env`
```
REQUIRE_AUTH=true
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
CORS_ORIGINS=http://localhost:5173
```
The React app already sends the user's Supabase token with every API call; the API verifies it with Supabase Auth.

### Step 6 — Run the frontend
```bash
npm run dev
```
Open http://localhost:5173 → **Create account** → fill the health form → you land on the app.
Check in Supabase **Table Editor** that rows appear in `profiles` and `emergency_contacts`.

### Step 7 — Deploy (optional)
`npm run build` → upload `dist/` to Netlify/Vercel. Set the three `VITE_*` variables in the host's settings, add the site URL to Supabase **Site URL / Redirect URLs**, and add it to the API's `CORS_ORIGINS`.

---

## Notes

- **Health data is sensitive.** Row Level Security protects rows per user, but before real patients use this you should add a privacy policy and consent text, check India's DPDP Act requirements, and restrict who can access the Supabase dashboard.
- The `health` column stores the form as JSON, so adding new fields later needs no migration.
- The health profile is summarised and sent to the AI as background context (allergies, blood thinners, pregnancy). Remove the `profile` arguments in `src/api.js` calls if you don't want that.
- `voice_assistant.py` was never used in `app.py`, so no voice feature was ported.
- This remains an educational prototype, not a diagnostic tool. In India call **112** for emergencies.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Supabase is not configured" screen | Fill `.env`, restart `npm run dev` |
| Sign-up works but nothing after | Email confirmation is ON — click the link, then log in |
| `permission denied` / `row-level security` error | Run `supabase/schema.sql` again; make sure you are logged in |
| "Could not save your profile" | Check the `profiles` table exists (Step 1) |
| "Cannot reach the backend…" | Start `uvicorn` (Step 5); check `VITE_API_URL` |
| API returns 401 | `REQUIRE_AUTH=true` is set but you are logged out, or the Supabase values in the Python `.env` are wrong |
| "Hospital dataset not found" | CSV must be at `public/phaltan_taluka_hospitals.csv` |
