from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, validator
from typing import Optional
import io
import csv
from model import (
    compute_character, compute_capacity, compute_capital,
    compute_conditions, compute_collateral, compute_final_score, make_decision,
)
from utils import research_agent, build_explanation, build_cam, generate_suggestions
from auth import (
    UserRegister, Token,
    hash_password, verify_password, create_access_token, get_current_user,
    fake_users_db,
)

app = FastAPI(title="Intelli-Credit API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngestInput(BaseModel):
    company_name: str
    revenue: float
    profit: float
    debt: float
    gst_growth_rate: float
    bank_cashflow_stability: float
    industry_risk: str          # "low" | "medium" | "high"
    litigation_flag: bool

    @validator("revenue")
    def revenue_positive(cls, v):
        if v <= 0:
            raise ValueError("Revenue must be greater than zero")
        return v

    @validator("bank_cashflow_stability")
    def cashflow_range(cls, v):
        if not (0 <= v <= 1):
            raise ValueError("bank_cashflow_stability must be between 0 and 1")
        return v

    @validator("industry_risk")
    def risk_valid(cls, v):
        if v.lower() not in ("low", "medium", "high"):
            raise ValueError("industry_risk must be low, medium, or high")
        return v.lower()


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/auth/register", status_code=201)
def register(body: UserRegister):
    if body.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already exists")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    fake_users_db[body.username] = hash_password(body.password)
    return {"message": "User registered successfully"}


@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    hashed = fake_users_db.get(form.username)
    if not hashed or not verify_password(form.password, hashed):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": form.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}


# ── Protected routes ──────────────────────────────────────────────────────────

@app.post("/ingest")
def ingest(data: IngestInput, _: str = Depends(get_current_user)):
    profit_margin = data.profit / data.revenue
    debt_ratio = data.debt / data.revenue
    return {
        "company_name": data.company_name,
        "revenue": data.revenue,
        "profit_margin": round(profit_margin, 4),
        "debt_ratio": round(debt_ratio, 4),
        "gst_growth_rate": data.gst_growth_rate,
        "bank_cashflow_stability": data.bank_cashflow_stability,
        "industry_risk": data.industry_risk,
        "litigation_flag": data.litigation_flag,
    }


@app.post("/predict")
def predict(data: IngestInput, _: str = Depends(get_current_user)):
    profit_margin = data.profit / data.revenue
    debt_ratio = data.debt / data.revenue

    signals = research_agent(data.litigation_flag, data.industry_risk)

    character  = compute_character(signals["promoter_score"], signals["compliance_score"])
    capacity   = compute_capacity(profit_margin * 100, data.bank_cashflow_stability)
    capital    = compute_capital(debt_ratio)
    conditions = compute_conditions(data.industry_risk, signals["sentiment_score"])
    collateral = compute_collateral(data.revenue)

    scores = {
        "character":  round(character, 2),
        "capacity":   round(capacity, 2),
        "capital":    round(capital, 2),
        "conditions": round(conditions, 2),
        "collateral": round(collateral, 2),
    }

    final_score = round(compute_final_score(**scores), 2)
    decision, loan_amount, interest_rate = make_decision(final_score, data.revenue)

    explanation = build_explanation(
        profit_margin, debt_ratio, data.bank_cashflow_stability,
        data.industry_risk, data.litigation_flag,
        signals["promoter_score"], scores, decision,
    )

    cam = build_cam(
        data.company_name, final_score, decision,
        loan_amount, interest_rate, explanation, scores,
    )

    suggestions = generate_suggestions(
        profit_margin, debt_ratio, data.bank_cashflow_stability,
        data.industry_risk, data.litigation_flag, final_score,
    )

    return {
        "ingested": {
            "profit_margin": round(profit_margin, 4),
            "debt_ratio": round(debt_ratio, 4),
        },
        "signals": signals,
        "scores": scores,
        "cam": cam,
        "suggestions": suggestions,
    }


@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), _: str = Depends(get_current_user)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    contents = await file.read()
    try:
        text = contents.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))
        raw_rows = list(reader)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file")

    required = {"company_name", "revenue", "profit", "debt",
                "gst_growth_rate", "bank_cashflow_stability", "industry_risk", "litigation_flag"}

    if not raw_rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    columns = {k.strip().lower() for k in raw_rows[0].keys()}
    missing = required - columns
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    rows = []
    for row in raw_rows:
        norm = {k.strip().lower(): v.strip() for k, v in row.items()}
        lit = norm["litigation_flag"].lower() in ("true", "1", "yes")
        risk = norm["industry_risk"].lower()
        if risk not in ("low", "medium", "high"):
            risk = "medium"
        rows.append({
            "company_name":            norm["company_name"],
            "revenue":                 float(norm["revenue"]),
            "profit":                  float(norm["profit"]),
            "debt":                    float(norm["debt"]),
            "gst_growth_rate":         float(norm["gst_growth_rate"]),
            "bank_cashflow_stability": float(norm["bank_cashflow_stability"]),
            "industry_risk":           risk,
            "litigation_flag":         lit,
        })

    return {"rows": rows, "count": len(rows)}
