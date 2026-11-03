import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Alert, CallButton, Field } from "../components/ui.jsx";

const ALIASES = {
  "Hospital Name": ["Hospital Name", "hospital_name", "Name"],
  Address: ["Address", "address", "Location"],
  Pincode: ["Pincode", "PIN Code", "Pin Code", "Pincode "],
  "Phone Number": ["Phone Number", "Phone", "Contact Number", "Mobile"],
  "Type of Hospital": ["Type of Hospital", "Type of Hospitals", "Hospital Type", "Type"],
};

const CSV_URL = "/phaltan_taluka_hospitals.csv"; // file lives in /public

function normalise(rows) {
  const out = rows.map((raw) => {
    const row = {};
    const trimmed = {};
    Object.keys(raw).forEach((k) => (trimmed[k.trim()] = raw[k]));
    for (const [standard, options] of Object.entries(ALIASES)) {
      const hit = options.find((o) => o.trim() in trimmed);
      row[standard] = hit ? String(trimmed[hit.trim()] ?? "").trim() : "";
    }
    return row;
  });
  const seen = new Set();
  return out.filter((r) => {
    const key = `${r["Hospital Name"]}||${r.Address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Hospitals() {
  const [all, setAll] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("All");
  const [applied, setApplied] = useState({ text: "", category: "All" });

  useEffect(() => {
    fetch(CSV_URL)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.text();
      })
      .then((csv) => {
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        const rows = normalise(parsed.data);
        if (rows.length && !rows.some((r) => r["Hospital Name"])) {
          throw new Error("Hospital CSV is missing required column(s): Hospital Name. Check the header row.");
        }
        setAll(rows);
      })
      .catch((e) =>
        setLoadError(
          e.message === "not found"
            ? "Hospital dataset not found: phaltan_taluka_hospitals.csv. Place this CSV inside the public/ folder."
            : `Could not load the hospital dataset. Details: ${e.message}`
        )
      );
  }, []);

  const categories = useMemo(
    () => (all ? [...new Set(all.map((h) => h["Type of Hospital"]).filter(Boolean))].sort() : []),
    [all]
  );

  const results = useMemo(() => {
    if (!all) return [];
    const q = applied.text.trim().toLowerCase();
    return all.filter((h) => {
      if (q) {
        const hay = `${h["Hospital Name"]} ${h.Address} ${h.Pincode} ${h["Type of Hospital"]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (applied.category !== "All" && h["Type of Hospital"].toLowerCase() !== applied.category.toLowerCase()) return false;
      return true;
    });
  }, [all, applied]);

  return (
    <>
      <div className="page-title">🏥 Nearby Hospital Finder</div>
      <Alert kind="error">
        Do not delay emergency care while searching. For a life-threatening emergency in India, call 112.
      </Alert>
      <CallButton label="📞 Call 112" />
      <p className="caption">
        Hospital records are loaded from your local Phaltan Taluka CSV dataset. Please verify contact
        details and emergency services before travelling.
      </p>

      {loadError && <Alert kind="warning">{loadError}</Alert>}

      {all && (
        <>
          <div className="metric-row">
            <div className="metric"><div className="label">Hospitals in dataset</div><div className="value">{all.length}</div></div>
            <div className="metric"><div className="label">Hospital categories</div><div className="value">{categories.length}</div></div>
          </div>

          <form
            className="card"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied({ text, category });
            }}
          >
            <Field label="Hospital name, address or PIN code">
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Phaltan or 415523" />
            </Field>
            <Field label="Hospital category">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>All</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <button className="btn btn-block" type="submit">Search hospitals</button>
          </form>

          <h2>🏥 Search Results ({results.length})</h2>
          {results.length === 0 ? (
            <Alert kind="info">No hospitals found. Try another name, locality, PIN code or category.</Alert>
          ) : (
            results.map((h, i) => {
              const name = h["Hospital Name"] || "Hospital";
              const phone = h["Phone Number"];
              const phoneOk = phone && !["nan", "unknown", "not available", "none"].includes(phone.toLowerCase());
              return (
                <div className="card" key={`${name}-${i}`}>
                  <h3>🏥 {name}</h3>
                  <div><b>Hospital type:</b> {h["Type of Hospital"] || "Not available"}</div>
                  <div><b>Address:</b> {h.Address || "Not available"}</div>
                  <div><b>PIN code:</b> {h.Pincode || "Not available"}</div>
                  <div><b>Phone:</b> {phoneOk ? phone : "Not available"}</div>
                  <div className="btn-row">
                    {phoneOk && /^[0-9+() -]+$/.test(phone) && (
                      <a className="btn" href={`tel:${phone}`}>📞 Call hospital</a>
                    )}
                    <a
                      className="btn"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${h.Address}`)}`}
                    >
                      📍 Find on Google Maps
                    </a>
                  </div>
                </div>
              );
            })
          )}
          <div className="caption">
            This search uses your local CSV and does not calculate the nearest hospital by distance.
            Dataset details have not been independently verified.
          </div>
        </>
      )}
    </>
  );
}
