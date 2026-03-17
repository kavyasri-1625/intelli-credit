import { useState, useRef } from "react";
import { useAuth } from "./AuthContext";

const BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace("/predict", "")
  : "http://localhost:8000";

const CSV_EXAMPLE = "company_name,revenue,profit,debt,gst_growth_rate,bank_cashflow_stability,industry_risk,litigation_flag";

export default function CsvUpload({ onLoad }) {
  const { token } = useAuth();
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedRow, setSelectedRow] = useState(0);
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setError("Please upload a .csv file."); return; }
    setError(""); setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE}/upload-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setRows(data.rows);
      setFileName(file.name);
      setSelectedRow(0);
      onLoad(data.rows[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function selectRow(i) {
    setSelectedRow(i);
    onLoad(rows[i]);
  }

  function clear() {
    setRows(null); setFileName(""); setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="csv-section card fade-in">
      <div className="card-header">
        <div className="card-icon">📂</div>
        <span className="card-title">Upload Financial Data (CSV)</span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--muted)" }}>
          Auto-fills the form below
        </span>
      </div>

      {!rows ? (
        <>
          <div
            className={`dropzone ${dragOver ? "drag-over" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file" accept=".csv"
              onChange={e => handleFile(e.target.files[0])}
            />
            <div className="dropzone-icon">{loading ? "⏳" : "📊"}</div>
            <div className="dropzone-title">
              {loading ? "Parsing CSV..." : "Drag & drop your CSV file here"}
            </div>
            <div className="dropzone-sub">or click to browse · .csv files only</div>
          </div>

          <div className="csv-format">
            <span style={{ color: "var(--blue)" }}>Required columns: </span>
            {CSV_EXAMPLE}
          </div>

          {error && <div className="error" style={{ marginTop: "0.5rem" }}>{error}</div>}
        </>
      ) : (
        <>
          <div className="csv-loaded">
            <div className="csv-loaded-left">
              <span>✅</span>
              <span>{fileName}</span>
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {rows.length} row{rows.length > 1 ? "s" : ""} loaded</span>
            </div>
            <button className="csv-clear" onClick={clear} title="Remove file">✕</button>
          </div>

          {rows.length > 1 && (
            <div className="csv-rows-select">
              <label>Select row to analyze:</label>
              {rows.map((r, i) => (
                <button
                  key={i}
                  className={`csv-row-btn ${selectedRow === i ? "active" : ""}`}
                  onClick={() => selectRow(i)}
                >
                  {r.company_name || `Row ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
