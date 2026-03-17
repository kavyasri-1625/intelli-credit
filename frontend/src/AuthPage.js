import { useState } from "react";
import { useAuth } from "./AuthContext";

const BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace("/predict", "")
  : "http://localhost:8000";

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!username.trim() || !password.trim()) { setError("Please enter username and password."); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch(`${BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registration failed");
        setSuccess("Account created. Please sign in.");
        setMode("login"); setPassword("");
      } else {
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("password", password);
        const res = await fetch(`${BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");
        login(data.access_token, username);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      {/* Left – form */}
      <div className="auth-left">
        <div className="auth-card fade-in">
          <div className="auth-logo">
            <div className="auth-logo-icon">🧠</div>
            <span className="auth-logo-text">Intelli-Credit</span>
          </div>

          <h1 className="auth-heading">{mode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="auth-sub">
            {mode === "login"
              ? "Sign in to access your credit intelligence dashboard"
              : "Join the AI-powered credit decision platform"}
          </p>

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>
              Sign In
            </button>
            <button className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}>
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Username</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input className="auth-input" type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username" autoComplete="username" />
              </div>
            </div>

            <div className="auth-form-group">
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input className="auth-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min. 6 characters" : "Enter your password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"} />
              </div>
            </div>

            {error   && <div className="error">{error}</div>}
            {success && <div className="success" style={{ marginTop: "0.5rem" }}>{success}</div>}

            <button className="btn" type="submit" disabled={loading} style={{ marginTop: "1.25rem" }}>
              {loading
                ? <><span className="spinner" />{mode === "login" ? "Signing in..." : "Creating account..."}</>
                : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.78rem", color: "var(--muted2)" }}>
            Secured with JWT authentication · Enterprise-grade encryption
          </div>
        </div>
      </div>

      {/* Right – image */}
      <div className="auth-right">
        <img
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop&q=80"
          alt="AI Finance Dashboard"
        />
        <div className="auth-right-overlay">
          <h2>AI-Powered Credit Intelligence</h2>
          <p>Analyze corporate credit risk using the Five Cs model with real-time explainability and automated CAM generation.</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {["Five Cs Model", "Risk Scoring", "CAM Reports", "Explainability"].map(t => (
              <span key={t} style={{
                background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: "6px", padding: "0.25rem 0.65rem",
                fontSize: "0.75rem", color: "var(--blue)", fontWeight: 600
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
