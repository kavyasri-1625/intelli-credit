# Intelli-Credit – AI-Powered Corporate Credit Decision Engine

A modular, full-stack credit appraisal system built on the Five Cs model with explainability and CAM output.

---

## Architecture

```
intelli-credit/
├── backend/
│   ├── main.py          ← FastAPI routes (/ingest, /predict)
│   ├── model.py         ← Five Cs scoring engine
│   ├── utils.py         ← Research agent + explainability + CAM builder
│   └── requirements.txt
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js       ← Main React app + Dashboard
    │   ├── index.js
    │   └── styles.css
    └── package.json
```

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm start
```

App: `http://localhost:3000`

---

## Deploying to Render (Backend)

1. Push repo to GitHub.
2. Render → New Web Service → connect repo.
3. Settings:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
4. Deploy and copy the public URL (e.g. `https://intelli-credit-api.onrender.com`).

---

## Deploying to Netlify (Frontend)

1. Set your Render URL as an environment variable before building:

```bash
cd frontend
REACT_APP_API_URL=https://your-render-url.onrender.com/predict npm run build
```

2. Netlify → Add new site → Deploy manually → drag the `frontend/build/` folder.

Or via CLI:
```bash
npm install -g netlify-cli
netlify deploy --dir build --prod
```

---

## Risk Scoring – Five Cs Model

| C           | Weight | Inputs                                  |
|-------------|--------|-----------------------------------------|
| Character   | 20%    | Promoter score + Compliance score       |
| Capacity    | 25%    | Profit margin + Cashflow stability      |
| Capital     | 20%    | Debt ratio                              |
| Conditions  | 20%    | Industry risk + Sentiment score         |
| Collateral  | 15%    | Revenue size tier                       |

| Risk Score | Decision             | Loan        | Rate |
|------------|----------------------|-------------|------|
| > 75       | APPROVED             | 30% revenue | 10%  |
| 55–75      | CONDITIONAL APPROVAL | 30% revenue | 12%  |
| < 55       | REJECTED             | $0          | 15%  |
