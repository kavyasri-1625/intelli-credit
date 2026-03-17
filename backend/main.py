from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, field_validator
from typing import Literal
import io
import pandas as pd
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
    allow_origins=[
        "http://localhost:3000",
        "https://intelli-credit.netlify.app",  # replace with your Netlify URL
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngestInput(BaseModel):
    company_name: str
    revenue: float
    profit: float
    debt: float
    gst_growth_rate: float
    bank_cashflow_stability: float   # 0–1
    industry_risk: Literal["low", "medium", "high"]
    litigation_flag: bool

    @field_validator("revenue")
    @classmethod
    def revenue_positive(cls, v):
        if v <= 0:
            raise ValueError("Revenue must be greater than zero")
        return v

    @field_validator("bank_cashflow_stability")
    @classmethod
    def cashflow_range(cls, v):
        if not (0 <= v <= 1):
            raise ValueError("bank_cashflow_stability must be between 0 and 1")
        return v


# ── Auth routes ──────────────────────────────────────────────────────────────

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
    """Data Ingestion Module – normalize and enrich input."""
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
    """Full credit appraisal pipeline."""
    if data.revenue <= 0:
        raise HTTPException(status_code=400, detail="Revenue must be greater than zero")

    # --- Data Ingestion ---
    profit_margin = data.profit / data.revenue
    debt_ratio = data.debt / data.revenue

    # --- Research Agent ---
    signals = research_agent(data.litigation_flag, data.industry_risk)

    # --- Five Cs Scoring ---
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

    # --- Decision ---
    decision, loan_amount, interest_rate = make_decision(final_score, data.revenue)

    # --- Explainability ---
    explanation = build_explanation(
        profit_margin, debt_ratio, data.bank_cashflow_stability,
        data.industry_risk, data.litigation_flag,
        signals["promoter_score"], scores, decision,
    )

    # --- CAM ---
    cam = build_cam(
        data.company_name, final_score, decision,
        loan_amount, interest_rate, explanation, scores,
    )

    # --- Suggestions ---
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
    """Parse uploaded CSV and return structured data for the first row."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file")

    required = {"company_name", "revenue", "profit", "debt",
                "gst_growth_rate", "bank_cashflow_stability", "industry_risk", "litigation_flag"}
    missing = required - set(df.columns.str.strip().str.lower())
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    df.columns = df.columns.str.strip().str.lower()
    rows = []
    for _, row in df.iterrows():
        lit = str(row["litigation_flag"]).strip().lower() in ("true", "1", "yes")
        risk = str(row["industry_risk"]).strip().lower()
        if risk not in ("low", "medium", "high"):
            risk = "medium"
        rows.append({
            "company_name":            str(row["company_name"]).strip(),
            "revenue":                 float(row["revenue"]),
            "profit":                  float(row["profit"]),
            "debt":                    float(row["debt"]),
            "gst_growth_rate":         float(row["gst_growth_rate"]),
            "bank_cashflow_stability": float(row["bank_cashflow_stability"]),
            "industry_risk":           risk,
            "litigation_flag":         lit,
        })

    return {"rows": rows, "count": len(rows)}
