export default function Suggestions({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  const criticals = suggestions.filter(s => s.type === "critical");
  const top3 = criticals.slice(0, 3);

  return (
    <div className="card fade-in" style={{ animationDelay: "0.25s" }}>
      <div className="card-header">
        <div className="card-icon">💡</div>
        <span className="card-title">AI Recommendations</span>
        {criticals.length > 0 && (
          <span className="top3-badge">
            ⚠ {criticals.length} Critical Issue{criticals.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {top3.length > 0 && (
        <div style={{
          background: "var(--red-bg)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem",
          fontSize: "0.82rem", color: "var(--red)",
        }}>
          <strong>⚠ Top {top3.length} Improvement{top3.length > 1 ? "s" : ""} Needed:</strong>{" "}
          {top3.map(s => s.text).join(" · ")}
        </div>
      )}

      <div className="suggestions-list">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`suggestion-item ${s.type}`}
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <span className="suggestion-icon">{s.icon}</span>
            <div className="suggestion-body">
              <div className="suggestion-text">{s.text}</div>
              <div className="suggestion-detail">{s.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
