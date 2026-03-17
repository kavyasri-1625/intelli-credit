import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import CsvUpload from "./CsvUpload";
import Suggestions from "./Suggestions";
import { generatePDF } from "./pdfExport";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/predict";

const INITIAL = {
  company_name: "", revenue: "", profit: "", debt: "",
  gst_growth_rate: "", bank_cashflow_stability: "",
  industry_risk: "medium", litigation_flag: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(v) {
  if (v >= 75) return "var(--green)";
  if (v >= 55) return "var(--yellow)";
  return "var(--red)";
}

function riskLabel(v) {
  if (v >= 75) return { label: "LOW RISK",    cls: "risk-low" };
  if (v >= 55) return { label: "MEDIUM RISK", cls: "risk-medium" };
  return           { label: "HIGH RISK",   cls: "risk-high" };
}

function badgeClass(decision) {
  if (decision === "APPROVED") return "badge-approved";
  if (decision === "CONDITIONAL APPROVAL") return "badge-conditional";
  return "badge-rejected";
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ score }) {
  const r = 70, cx = 90, cy = 90;
  const circumference = Math.PI * r;          // half-circle arc
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circumference * (1 - pct);
  const color = scoreColor(score);

  return (
    <div className="gauge-wrap">
      <div className="gauge-container" style={{ width: 180, height: 100 }}>
        <svg width="180" height="100" className="gauge-svg">
          {/* track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="var(--surface3)" strokeWidth="10" strokeLinecap="round"
          />
          {/* fill */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="gauge-center" style={{ bottom: 4 }}>
          <span className="gauge-score" style={{ color }}>{score}</span>
          <span className="gauge-label">/ 100</span>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function Bar({ value }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${value}%`, background: scoreColor(value) }} />
    </div>
  );
}

// ── Five Cs ───────────────────────────────────────────────────────────────────
const CS_META = {
  character:  { icon: "🧑‍💼", color: "#6366F1", weight: "20%" },
  capacity:   { icon: "⚡",   color: "#3B82F6", weight: "25%" },
  capital:    { icon: "💰",   color: "#22C55E", weight: "20%" },
  conditions: { icon: "🌐",   color: "#F59E0B", weight: "20%" },
  collateral: { icon: "🏦",   color: "#EC4899", weight: "15%" },
};

function FiveCs({ scores }) {
  return (
    <div className="five-cs">
      {Object.entries(scores).map(([key, val]) => {
        const meta = CS_META[key];
        return (
          <div className="cs-row" key={key}>
            <div className="cs-header">
              <div className="cs-left">
                <div className="cs-icon" style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                  {meta.icon}
                </div>
                <span className="cs-name" style={{ textTransform: "capitalize" }}>{key}</span>
                <span className="cs-weight">({meta.weight})</span>
              </div>
              <span className="cs-val" style={{ color: scoreColor(val) }}>{val}</span>
            </div>
            <Bar value={val} />
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ data, onReset }) {
  const { cam, scores, suggestions } = data;
  const risk = riskLabel(cam.risk_score);

  return (
    <div className="dashboard">
      {/* Top row: gauge + five cs */}
      <div className="dashboard-top">
        {/* Score card */}
        <div className="card fade-in">
          <div className="card-header">
            <div className="card-icon">📊</div>
            <span className="card-title">Risk Score</span>
          </div>
          <Gauge score={cam.risk_score} />
          <div style={{ textAlign: "center", marginTop: "0.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <span className={`decision-badge ${badgeClass(cam.decision)}`}>
              {cam.decision === "APPROVED" ? "✅" : cam.decision === "CONDITIONAL APPROVAL" ? "⚠️" : "❌"} {cam.decision}
            </span>
            <span className={`risk-badge ${risk.cls}`}>{risk.label}</span>
          </div>
          <div className="metric-grid">
            <div className="metric-tile">
              <div className="mt-label">Loan Amount</div>
              <div className="mt-value" style={{ color: "var(--green)" }}>
                ${cam.loan_amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </div>
              <div className="mt-sub">Approved credit limit</div>
            </div>
            <div className="metric-tile">
              <div className="mt-label">Interest Rate</div>
              <div className="mt-value" style={{ color: "var(--blue)" }}>{cam.interest_rate}%</div>
              <div className="mt-sub">Annual rate</div>
            </div>
          </div>
        </div>

        {/* Five Cs */}
        <div className="card fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="card-header">
            <div className="card-icon">🎯</div>
            <span className="card-title">Five Cs Sub-Scores</span>
          </div>
          <FiveCs scores={scores} />
        </div>
      </div>

      {/* Explainability */}
      <div className="card fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="card-header">
          <div className="card-icon">🔍</div>
          <span className="card-title">Explainability</span>
        </div>
        <div className="explain-grid">
          <div>
            <div className="explain-col-title" style={{ color: "var(--green)" }}>
              ✅ Strengths
            </div>
            <ul className="factor-list">
              {cam.strengths.map((s, i) => (
                <li className="factor-item" key={i} style={{ borderColor: "rgba(34,197,94,0.15)" }}>
                  <span className="factor-icon">✔️</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="explain-col-title" style={{ color: "var(--red)" }}>
              ⚠️ Risk Factors
            </div>
            <ul className="factor-list">
              {cam.risks.map((r, i) => (
                <li className="factor-item" key={i} style={{ borderColor: "rgba(239,68,68,0.15)" }}>
                  <span className="factor-icon">⚠️</span>{r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="reasoning-box">💡 {cam.explanation}</div>
      </div>

      {/* Suggestions */}
      <Suggestions suggestions={suggestions} />

      {/* CAM */}
      <div className="card fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="card-header">
          <div className="card-icon">📋</div>
          <span className="card-title">Credit Appraisal Memo (CAM)</span>
        </div>
        <div className="cam-grid">
          <div className="cam-section" style={{ gridColumn: "1 / -1" }}>
            <div className="cam-section-title">📊 Executive Summary</div>
            <p>{cam.summary}</p>
          </div>
          <div className="cam-section">
            <div className="cam-section-title">💰 Loan Details</div>
            <div className="cam-kv">
              <div className="cam-kv-row">
                <span className="ck-label">Company</span>
                <span className="ck-val">{cam.company}</span>
              </div>
              <div className="cam-kv-row">
                <span className="ck-label">Decision</span>
                <span className="ck-val" style={{ color: cam.decision === "APPROVED" ? "var(--green)" : cam.decision === "CONDITIONAL APPROVAL" ? "var(--yellow)" : "var(--red)" }}>
                  {cam.decision}
                </span>
              </div>
              <div className="cam-kv-row">
                <span className="ck-label">Loan Amount</span>
                <span className="ck-val">${cam.loan_amount.toLocaleString()}</span>
              </div>
              <div className="cam-kv-row">
                <span className="ck-label">Interest Rate</span>
                <span className="ck-val">{cam.interest_rate}% p.a.</span>
              </div>
            </div>
          </div>
          <div className="cam-section">
            <div className="cam-section-title">📈 Key Metrics</div>
            <div className="cam-kv">
              {Object.entries(scores).map(([k, v]) => (
                <div className="cam-kv-row" key={k}>
                  <span className="ck-label" style={{ textTransform: "capitalize" }}>{k}</span>
                  <span className="ck-val" style={{ color: scoreColor(v) }}>{v}/100</span>
                </div>
              ))}
            </div>
          </div>
          <div className="cam-section">
            <div className="cam-section-title">✅ Strengths</div>
            <ul className="cam-list">
              {cam.strengths.map((s, i) => <li key={i}><span>✔</span>{s}</li>)}
            </ul>
          </div>
          <div className="cam-section">
            <div className="cam-section-title">⚠️ Risk Factors</div>
            <ul className="cam-list">
              {cam.risks.map((r, i) => <li key={i}><span>⚠</span>{r}</li>)}
            </ul>
          </div>
        </div>

        <div className="cam-actions">
          <button className="btn btn-sm" onClick={() => generatePDF(cam, scores, suggestions)}>
            📄 Download CAM Report (PDF)
          </button>
          <button className="btn btn-outline btn-sm" onClick={onReset}>
            ↩ New Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Input form ────────────────────────────────────────────────────────────────
const FIELDS = [
  { name: "revenue",               label: "Annual Revenue ($)",          icon: "💵", placeholder: "e.g. 5000000",  hint: "Total annual revenue" },
  { name: "profit",                label: "Annual Profit ($)",           icon: "📈", placeholder: "e.g. 800000",   hint: "Net profit after expenses" },
  { name: "debt",                  label: "Total Debt ($)",              icon: "📉", placeholder: "e.g. 1200000",  hint: "All outstanding liabilities" },
  { name: "gst_growth_rate",       label: "GST Growth Rate (%)",         icon: "📊", placeholder: "e.g. 12.5",     hint: "Year-on-year GST growth" },
  { name: "bank_cashflow_stability", label: "Cashflow Stability (0–1)", icon: "🏦", placeholder: "e.g. 0.75",     hint: "0 = unstable, 1 = very stable" },
];

export default function App() {
  const { isAuthed, username, logout, token } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthed) return <AuthPage />;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setResult(null);

    const payload = {
      company_name: form.company_name.trim(),
      revenue: parseFloat(form.revenue),
      profit: parseFloat(form.profit),
      debt: parseFloat(form.debt),
      gst_growth_rate: parseFloat(form.gst_growth_rate),
      bank_cashflow_stability: parseFloat(form.bank_cashflow_stability),
      industry_risk: form.industry_risk,
      litigation_flag: form.litigation_flag,
    };

    for (const [k, v] of Object.entries(payload)) {
      if (v === "" || (typeof v === "number" && isNaN(v))) {
        setError(`Missing field: ${k.replace(/_/g, " ")}`); return;
      }
    }
    if (payload.revenue <= 0) { setError("Revenue must be greater than zero."); return; }
    if (payload.bank_cashflow_stability < 0 || payload.bank_cashflow_stability > 1) {
      setError("Cashflow stability must be between 0 and 1."); return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Server error"); }
      setResult(await res.json());
      setTimeout(() => document.getElementById("results-anchor")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err.message || "Could not connect to the API. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-icon">🧠</div>
          <div>
            <div className="navbar-title">Intelli-Credit</div>
            <div className="navbar-subtitle">AI-Powered Credit Intelligence Platform</div>
          </div>
        </div>
        <div className="navbar-right">
          <div className="nav-user">
            <div className="nav-avatar">{username[0]?.toUpperCase()}</div>
            <span>{username}</span>
          </div>
          <button className="nav-logout" onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="fade-in">
          <div className="hero-badge">🤖 AI-Powered · Five Cs Model · Real-time Analysis</div>
          <h1>Corporate Credit<br /><span>Decision Engine</span></h1>
          <p>Analyze corporate credit risk using the Five Cs model with AI-driven explainability, automated CAM generation, and real-time scoring.</p>
          <div className="hero-stats">
            <div className="hero-stat"><div className="hs-val">5</div><div className="hs-label">Risk Dimensions</div></div>
            <div className="hero-stat"><div className="hs-val">3</div><div className="hs-label">Decision Tiers</div></div>
            <div className="hero-stat"><div className="hs-val">AI</div><div className="hs-label">Explainability</div></div>
            <div className="hero-stat"><div className="hs-val">CAM</div><div className="hs-label">Auto Report</div></div>
          </div>
        </div>
        <div className="hero-img fade-in" style={{ animationDelay: "0.15s" }}>
          <img
            src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80"
            alt="AI Finance Analytics"
          />
          <div className="hero-img-overlay" />
        </div>
      </section>

      {/* Main */}
      <main className="main">
        {/* CSV Upload */}
        <CsvUpload onLoad={row => setForm({
          company_name:            row.company_name || "",
          revenue:                 row.revenue || "",
          profit:                  row.profit || "",
          debt:                    row.debt || "",
          gst_growth_rate:         row.gst_growth_rate || "",
          bank_cashflow_stability: row.bank_cashflow_stability || "",
          industry_risk:           row.industry_risk || "medium",
          litigation_flag:         row.litigation_flag || false,
        })} />

        {/* Form */}
        <div className="form-layout">
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-icon">📝</div>
              <span className="card-title">Company Financial Data</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Company Name</label>
                  <div className="input-wrap">
                    <span className="input-icon">🏢</span>
                    <input name="company_name" value={form.company_name} onChange={handleChange} placeholder="e.g. Acme Corporation" />
                  </div>
                </div>

                {FIELDS.map(f => (
                  <div className="form-group" key={f.name}>
                    <label title={f.hint}>{f.label}</label>
                    <div className="input-wrap">
                      <span className="input-icon">{f.icon}</span>
                      <input
                        name={f.name} type="number" step="any"
                        value={form[f.name]} onChange={handleChange}
                        placeholder={f.placeholder}
                        title={f.hint}
                      />
                    </div>
                    <span className="input-hint">{f.hint}</span>
                  </div>
                ))}

                <div className="form-group">
                  <label>Industry Risk</label>
                  <div className="input-wrap">
                    <span className="input-icon">🌐</span>
                    <select name="industry_risk" value={form.industry_risk} onChange={handleChange}>
                      <option value="low">Low Risk Industry</option>
                      <option value="medium">Medium Risk Industry</option>
                      <option value="high">High Risk Industry</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ justifyContent: "flex-end" }}>
                  <label>Litigation Flag</label>
                  <div className="toggle-row">
                    <label className="switch">
                      <input type="checkbox" name="litigation_flag" checked={form.litigation_flag} onChange={handleChange} />
                      <span className="slider" />
                    </label>
                    <span style={{ fontSize: "0.85rem", color: form.litigation_flag ? "var(--red)" : "var(--muted)" }}>
                      {form.litigation_flag ? "⚠️ Active litigation" : "✅ No litigation"}
                    </span>
                  </div>
                </div>
              </div>

              {error && <div className="error">{error}</div>}

              <button className="btn" type="submit" disabled={loading}>
                {loading
                  ? <><span className="spinner" />Analyzing credit risk using AI...</>
                  : "🚀 Run Credit Analysis"}
              </button>
            </form>
          </div>

          {/* Side image */}
          <div className="form-side-img fade-in" style={{ animationDelay: "0.1s" }}>
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80"
              alt="Document Analysis"
            />
            <div className="form-side-overlay">
              <h3>AI Document Analysis</h3>
              <p>Our engine processes financial statements, GST data, and bank statements to generate a comprehensive credit profile.</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card fade-in">
            <div className="loading-overlay">
              <div className="loading-spinner-lg" />
              <div className="loading-text">Analyzing credit risk using AI — Five Cs model in progress...</div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div id="results-anchor">
            <Dashboard data={result} onReset={() => { setResult(null); setForm(INITIAL); }} />
          </div>
        )}
      </main>
    </>
  );
}
