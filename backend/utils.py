"""
Research Agent (simulated) + Explainability Engine
"""
import random

def research_agent(litigation_flag: bool, industry_risk: str) -> dict:
    """Simulate AI research agent generating enriched signals."""
    random.seed(42)  # deterministic for same inputs

    promoter_score = random.uniform(60, 90)
    compliance_score = random.uniform(65, 95)
    sentiment_score = random.uniform(-0.2, 0.6)

    if litigation_flag:
        promoter_score = max(promoter_score - 25, 10)
        compliance_score = max(compliance_score - 15, 10)

    if industry_risk == "high":
        sentiment_score = min(sentiment_score - 0.4, -0.1)
    elif industry_risk == "medium":
        sentiment_score = sentiment_score - 0.1

    return {
        "promoter_score": round(promoter_score, 2),
        "compliance_score": round(compliance_score, 2),
        "sentiment_score": round(max(min(sentiment_score, 1.0), -1.0), 3),
    }


def build_explanation(
    profit_margin: float,
    debt_ratio: float,
    cashflow_stability: float,
    industry_risk: str,
    litigation_flag: bool,
    promoter_score: float,
    scores: dict,
    decision: str,
) -> dict:
    positives = []
    negatives = []

    if scores["capacity"] >= 65:
        positives.append("Strong profit margin and stable cashflow improved capacity score")
    if scores["character"] >= 65:
        positives.append("Good promoter credibility and compliance history")
    if scores["capital"] >= 65:
        positives.append("Healthy debt ratio indicates strong capital position")
    if scores["conditions"] >= 65:
        positives.append("Favorable industry conditions and positive market sentiment")
    if scores["collateral"] >= 65:
        positives.append("Revenue size supports adequate collateral coverage")

    if debt_ratio > 0.6:
        negatives.append("High debt-to-revenue ratio reduces capital score")
    if litigation_flag:
        negatives.append("Active litigation flag significantly reduces promoter trust")
    if industry_risk == "high":
        negatives.append("High industry risk lowers conditions score")
    if cashflow_stability < 0.4:
        negatives.append("Low bank cashflow stability weakens capacity assessment")
    if profit_margin < 0.1:
        negatives.append("Thin profit margin limits capacity score")
    if scores["character"] < 55:
        negatives.append("Weak compliance or promoter score hurt character rating")

    if not positives:
        positives.append("Some financial metrics met minimum thresholds")
    if not negatives:
        negatives.append("No major risk flags identified")

    pos_str = ". ".join(positives)
    neg_str = ". ".join(negatives)
    reasoning = f"{pos_str}. However, {neg_str.lower()}. Final decision: {decision}."

    return {
        "positive_factors": positives,
        "negative_factors": negatives,
        "final_reasoning": reasoning,
    }


def build_cam(
    company_name: str,
    risk_score: float,
    decision: str,
    loan_amount: float,
    interest_rate: float,
    explanation: dict,
    scores: dict,
) -> dict:
    strengths = explanation["positive_factors"]
    risks = explanation["negative_factors"]

    summary = (
        f"{company_name} received a risk score of {risk_score}/100. "
        f"Decision: {decision}. "
        f"Approved loan: ${loan_amount:,.2f} at {interest_rate}% interest rate."
    )

    return {
        "company": company_name,
        "risk_score": risk_score,
        "decision": decision,
        "loan_amount": loan_amount,
        "interest_rate": interest_rate,
        "sub_scores": scores,
        "summary": summary,
        "strengths": strengths,
        "risks": risks,
        "explanation": explanation["final_reasoning"],
    }


def generate_suggestions(
    profit_margin: float,
    debt_ratio: float,
    cashflow_stability: float,
    industry_risk: str,
    litigation_flag: bool,
    risk_score: float,
) -> list:
    """Generate actionable AI recommendations based on financial inputs."""
    suggestions = []

    if debt_ratio > 0.5:
        suggestions.append({
            "type": "critical",
            "icon": "📉",
            "text": "Reduce debt levels to improve capital structure",
            "detail": f"Current debt ratio is {round(debt_ratio * 100, 1)}% of revenue — target below 50%.",
        })

    if profit_margin < 0.1:
        suggestions.append({
            "type": "critical",
            "icon": "💸",
            "text": "Improve profitability through cost optimization",
            "detail": f"Profit margin of {round(profit_margin * 100, 1)}% is below the 10% threshold for healthy lending.",
        })

    if cashflow_stability < 0.5:
        suggestions.append({
            "type": "warning",
            "icon": "🏦",
            "text": "Stabilize cash flows for better repayment confidence",
            "detail": f"Cashflow stability score of {cashflow_stability} is low — lenders prefer scores above 0.5.",
        })

    if litigation_flag:
        suggestions.append({
            "type": "critical",
            "icon": "⚖️",
            "text": "Resolve legal issues to improve credibility",
            "detail": "Active litigation significantly reduces promoter trust and compliance scores.",
        })

    if industry_risk == "high":
        suggestions.append({
            "type": "warning",
            "icon": "🌐",
            "text": "Consider risk mitigation strategies due to industry volatility",
            "detail": "High-risk industry classification negatively impacts conditions score.",
        })

    if risk_score > 75:
        suggestions.append({
            "type": "positive",
            "icon": "🌟",
            "text": "Eligible for better loan terms and lower interest rates",
            "detail": f"Strong risk score of {risk_score} qualifies for preferential lending rates.",
        })

    if debt_ratio <= 0.3 and profit_margin >= 0.15:
        suggestions.append({
            "type": "positive",
            "icon": "✅",
            "text": "Strong financial fundamentals — consider expanding credit limit",
            "detail": "Low debt and high profitability indicate capacity for larger credit facilities.",
        })

    if not suggestions:
        suggestions.append({
            "type": "info",
            "icon": "💡",
            "text": "Maintain current financial discipline",
            "detail": "No critical issues detected. Continue monitoring key financial ratios.",
        })

    return suggestions
