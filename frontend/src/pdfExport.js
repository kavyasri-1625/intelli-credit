import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePDF(cam, scores, suggestions = []) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // ── Header ──
  doc.setFillColor(11, 15, 26);
  doc.rect(0, 0, W, 40, "F");
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text("INTELLI-CREDIT", 14, 18);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(156, 163, 175);
  doc.text("AI-Powered Corporate Credit Decision Engine", 14, 26);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);

  // Decision badge color
  const decColor =
    cam.decision === "APPROVED" ? [34, 197, 94] :
    cam.decision === "CONDITIONAL APPROVAL" ? [245, 158, 11] : [239, 68, 68];

  doc.setFillColor(...decColor);
  doc.roundedRect(W - 60, 10, 46, 12, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(cam.decision, W - 37, 18, { align: "center" });

  let y = 50;

  // ── Executive Summary ──
  doc.setTextColor(249, 250, 251);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, y); y += 7;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(209, 213, 219);
  const lines = doc.splitTextToSize(cam.summary, W - 28);
  doc.text(lines, 14, y); y += lines.length * 5 + 6;

  // ── Score + Loan ──
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Risk Score", `${cam.risk_score} / 100`],
      ["Decision", cam.decision],
      ["Loan Amount", `$${cam.loan_amount.toLocaleString()}`],
      ["Interest Rate", `${cam.interest_rate}% p.a.`],
    ],
    theme: "grid",
    headStyles: { fillColor: [31, 41, 55], textColor: [59, 130, 246], fontStyle: "bold" },
    bodyStyles: { fillColor: [17, 24, 39], textColor: [249, 250, 251] },
    alternateRowStyles: { fillColor: [31, 41, 55] },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Five Cs ──
  doc.setTextColor(249, 250, 251);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("Five Cs Sub-Scores", 14, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Dimension", "Score", "Weight", "Assessment"]],
    body: Object.entries(scores).map(([k, v]) => {
      const weights = { character: "20%", capacity: "25%", capital: "20%", conditions: "20%", collateral: "15%" };
      const assess = v >= 75 ? "Strong" : v >= 55 ? "Moderate" : "Weak";
      return [k.charAt(0).toUpperCase() + k.slice(1), `${v}/100`, weights[k], assess];
    }),
    theme: "grid",
    headStyles: { fillColor: [31, 41, 55], textColor: [59, 130, 246], fontStyle: "bold" },
    bodyStyles: { fillColor: [17, 24, 39], textColor: [249, 250, 251] },
    alternateRowStyles: { fillColor: [31, 41, 55] },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Strengths ──
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Strengths", 14, y); y += 6;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(209, 213, 219);
  cam.strengths.forEach(s => {
    doc.text(`✓  ${s}`, 16, y); y += 6;
  });
  y += 2;

  // ── Risk Factors ──
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Risk Factors", 14, y); y += 6;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(209, 213, 219);
  cam.risks.forEach(r => {
    doc.text(`⚠  ${r}`, 16, y); y += 6;
  });
  y += 4;

  // ── Reasoning ──
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("AI Reasoning", 14, y); y += 6;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(209, 213, 219);
  const rLines = doc.splitTextToSize(cam.explanation, W - 28);
  doc.text(rLines, 14, y);

  // ── Suggestions ──
  if (suggestions.length > 0) {
    y += 4;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("AI Recommendations", 14, y); y += 6;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    suggestions.forEach(s => {
      const color =
        s.type === "critical" ? [239, 68, 68] :
        s.type === "warning"  ? [245, 158, 11] :
        s.type === "positive" ? [34, 197, 94]  : [59, 130, 246];
      doc.setTextColor(...color);
      doc.text(`${s.icon}  ${s.text}`, 16, y); y += 5;
      doc.setTextColor(156, 163, 175);
      const dl = doc.splitTextToSize(`    ${s.detail}`, W - 32);
      doc.text(dl, 16, y); y += dl.length * 4.5 + 2;
    });
  }

  // ── Footer ──
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text("Intelli-Credit – Confidential Credit Appraisal Memo", 14, 290);
    doc.text(`Page ${i} of ${pages}`, W - 14, 290, { align: "right" });
  }

  doc.save(`CAM_${cam.company.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}
