"""
Risk Scoring Engine – Five Cs model
"""

def compute_character(promoter_score: float, compliance_score: float) -> float:
    return min((promoter_score * 0.5 + compliance_score * 0.5), 100)

def compute_capacity(profit_margin: float, cashflow_stability: float) -> float:
    # profit_margin as percentage, cashflow_stability 0-1
    pm_score = min(max(profit_margin * 2, 0), 100)   # 50% margin → 100
    cf_score = cashflow_stability * 100
    return pm_score * 0.6 + cf_score * 0.4

def compute_capital(debt_ratio: float) -> float:
    # Lower debt ratio → higher capital score
    score = max(100 - (debt_ratio * 100), 0)
    return min(score, 100)

def compute_conditions(industry_risk: str, sentiment_score: float) -> float:
    risk_map = {"low": 80, "medium": 55, "high": 25}
    base = risk_map.get(industry_risk, 55)
    sentiment_boost = sentiment_score * 20   # -20 to +20
    return min(max(base + sentiment_boost, 0), 100)

def compute_collateral(revenue: float) -> float:
    # Simulate collateral quality by revenue size tiers
    if revenue >= 10_000_000:
        return 90
    elif revenue >= 1_000_000:
        return 70
    elif revenue >= 100_000:
        return 50
    return 30

def compute_final_score(character, capacity, capital, conditions, collateral) -> float:
    return (
        character   * 0.20 +
        capacity    * 0.25 +
        capital     * 0.20 +
        conditions  * 0.20 +
        collateral  * 0.15
    )

def make_decision(score: float, revenue: float):
    loan = round(revenue * 0.3, 2)
    if score > 75:
        return "APPROVED", loan, 10.0
    elif score >= 55:
        return "CONDITIONAL APPROVAL", loan, 12.0
    else:
        return "REJECTED", 0.0, 15.0
