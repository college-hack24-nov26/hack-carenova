import ReactMarkdown from "react-markdown";

export function Alert({ kind = "info", children }) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function Spinner({ text }) {
  return (
    <div className="spinner-row">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}

export function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown>{String(children ?? "")}</ReactMarkdown>
    </div>
  );
}

function sourceLabel(src) {
  if (typeof src === "string") return src;
  const file = src.source_file || src.source || src.file_path || "Knowledge base";
  const page = src.page_number ?? src.page;
  return page !== undefined && page !== null ? `${file}, page ${page}` : file;
}

export function Sources({ sources }) {
  if (!sources || sources.length === 0) return null;
  const seen = new Set();
  const labels = sources.map(sourceLabel).filter((l) => (seen.has(l) ? false : seen.add(l)));
  return (
    <details className="expander">
      <summary>📚 Sources</summary>
      <ul>
        {labels.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </details>
  );
}

export function CallButton({ label = "📞 Call Emergency Number 112", block = false }) {
  return (
    <a className={`btn ${block ? "btn-block" : ""}`} href="tel:112">
      {label}
    </a>
  );
}

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export function RadioRow({ name, value, options, onChange }) {
  return (
    <div className="radio-row">
      {options.map((o) => (
        <label key={o}>
          <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}
