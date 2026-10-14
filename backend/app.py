import json, sqlite3, io, csv
from pathlib import Path
from datetime import datetime, timezone
import duckdb, pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Literal
from analytics.pipeline import ROOT, current, records, rank

app = FastAPI(title="ClientLens", version="1.0")
DB = ROOT / "data/processed/reviews.sqlite"


def load():
    try:
        p = current() / "derived"
        a = json.loads((p / "analysis.json").read_text())
        f = rank(pd.read_csv(p / "features.csv"), a["config"])
        return p, a, f
    except (FileNotFoundError, ValueError):
        raise HTTPException(
            503, "No complete dataset. Run python -m analytics.pipeline refresh."
        )


def query(sql, args=[]):
    p, _, _ = load()
    with duckdb.connect(str(p / "analytics.duckdb"), read_only=True) as con:
        return records(con.execute(sql, args).df())


def statuses():
    DB.parent.mkdir(exist_ok=True, parents=True)
    with sqlite3.connect(DB) as c:
        c.execute(
            "CREATE TABLE IF NOT EXISTS reviews (account_id TEXT PRIMARY KEY,status TEXT NOT NULL,updated_at TEXT NOT NULL)"
        )
        return {
            r[0]: {"status": r[1], "updated_at": r[2]}
            for r in c.execute("SELECT * FROM reviews")
        }


def filtered(f, cohort, industry="All", size="All", search="", flag="All"):
    d = f[f.cohort == cohort]
    if industry != "All":
        d = d[d.industry == industry]
    if size != "All":
        d = d[d.company_size == size]
    if search:
        d = d[
            d.fictional_account_name.str.contains(search, case=False, regex=False)
            | d.account_id.str.contains(search, case=False, regex=False)
        ]
    if flag == "Flagged":
        d = d[d["flags"] > 0]
    if flag == "Severe support":
        d = d[d.severe_open > 0]
    return d


@app.get("/api/bootstrap")
def bootstrap():
    p, a, f = load()
    meta = json.loads((p / "metadata.json").read_text())
    status = json.loads((ROOT / "data/refresh_status.json").read_text())
    age = (
        datetime.now(timezone.utc) - datetime.fromisoformat(meta["generated_at"])
    ).total_seconds() / 3600
    return dict(
        cohorts=sorted(f.cohort.unique()),
        industries=sorted(f.industry.unique()),
        sizes=["Small", "Mid-market", "Enterprise"],
        metadata=meta,
        refresh=status,
        stale=status["status"] != "success" or age > 24,
        age_hours=age,
    )


@app.get("/api/portfolio")
def portfolio(
    cohort: str,
    industry: str = "All",
    size: str = "All",
    k: int = Query(50, ge=1, le=50),
):
    p, a, f = load()
    d = filtered(f, cohort, industry, size)
    chosen = d.head(k)
    ids = d.account_id.tolist()
    evidence = query(
        "SELECT * FROM demand_evidence WHERE account_id IN (SELECT account_id FROM features WHERE cohort=?)",
        [cohort],
    )
    evidence = [r for r in evidence if r["account_id"] in ids]
    classified = query(
        "SELECT request_id,account_id FROM observed_requests WHERE account_id IN (SELECT account_id FROM features WHERE cohort=?)",
        [cohort],
    )
    classified = [r for r in classified if r["account_id"] in ids]
    covered = {r["request_id"] for r in evidence if r["topic"] != "Other or unclear"}
    topics = [
        dict(
            topic=t,
            accounts=len({r["account_id"] for r in evidence if r["topic"] == t}),
            gaps=len(
                {
                    r["account_id"]
                    for r in evidence
                    if r["topic"] == t
                    and not r["matching_view"]
                    and r["content_available"]
                }
            ),
        )
        for t in [
            "AI adoption",
            "Cybersecurity",
            "Cloud costs",
            "Data governance",
            "Workforce planning",
            "Other or unclear",
        ]
    ]
    segments = []
    for field in ["company_size", "industry", "tenure_band"]:
        dd = d.copy()
        dd["tenure_band"] = pd.cut(
            dd.tenure_days,
            [0, 365, 730, 10000],
            labels=["Under 1 year", "1–2 years", "Over 2 years"],
        )
        for name, g in dd.groupby(field, observed=True):
            segments.append(
                dict(
                    dimension=field,
                    name=str(name),
                    accounts=len(g),
                    active_users=int(g.active_users.sum()),
                    eligible_seats=int(g.eligible_seats.sum()),
                    consulted=int((g.consultations > 0).sum()),
                    attended=int((g.attendance > 0).sum()),
                )
            )
    return dict(
        eligible=len(d),
        cutoff=d.cutoff.iloc[0] if len(d) else None,
        flagged=int((d["flags"] > 0).sum()),
        exposure=float(chosen.annual_value.sum()),
        review_count=len(chosen),
        active_users=int(d.active_users.sum()),
        eligible_seats=int(d.eligible_seats.sum()),
        recent=int(d.recent.sum()),
        previous=int(d.previous.sum()),
        consulted=int((d.consultations > 0).sum()),
        attended=int((d.attendance > 0).sum()),
        severe_open=int(d.severe_open.sum()),
        classification_count=len(classified),
        classified=len(covered),
        topics=topics,
        evidence=evidence,
        segments=segments,
        top=records(chosen.head(5)),
        activity=records(
            d.groupby("activity_category").size().reset_index(name="accounts")
        ),
    )


@app.get("/api/accounts")
def accounts(
    cohort: str,
    industry: str = "All",
    size: str = "All",
    search: str = "",
    flag: str = "All",
    sort: Literal["priority", "value", "name"] = "priority",
    k: int = Query(50, ge=1, le=50),
    page: int = Query(1, ge=1),
    status: str = "All",
    export: bool = False,
):
    _, _, f = load()
    d = filtered(f, cohort, industry, size, search, flag)
    s = statuses()
    d["review_status"] = d.account_id.map(
        lambda x: s.get(x, {}).get("status", "Not reviewed")
    )
    if status != "All":
        d = d[d.review_status == status]
    d = d.head(k)  # Capacity is applied to priority order before display sorting.
    if sort == "value":
        d = d.sort_values("annual_value", ascending=False)
    if sort == "name":
        d = d.sort_values("fictional_account_name")
    if export:
        return Response(
            d.to_csv(index=False),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=clientlens-filtered-review.csv"
            },
        )
    return dict(
        total=len(d), rows=records(d.iloc[(page - 1) * 10 : page * 10]), page=page
    )


@app.get("/api/accounts/{account_id}")
def account(account_id: str):
    _, a, f = load()
    row = f[f.account_id == account_id]
    if row.empty:
        raise HTTPException(404, "Account not found")
    events = query(
        "SELECT e.*,c.title,c.topic FROM observed_events e LEFT JOIN content c USING(content_id) WHERE e.account_id=? ORDER BY event_time DESC",
        [account_id],
    )
    requests = query(
        "SELECT * FROM demand_evidence WHERE account_id=? ORDER BY request_time DESC",
        [account_id],
    )
    tickets = query(
        "SELECT s.ticket_id,s.opened_at,s.available_at,s.severity,CASE WHEN closed_at<cutoff THEN CAST(closed_at AS VARCHAR) ELSE NULL END AS closed_at,CASE WHEN closed_at IS NULL OR closed_at>=cutoff THEN 'Open at cutoff' ELSE 'Closed before cutoff' END AS cutoff_status FROM support s JOIN cutoffs c USING(account_id) WHERE account_id=? AND opened_at<cutoff AND available_at<=cutoff",
        [account_id],
    )
    return dict(
        account=records(row)[0],
        events=events,
        requests=requests,
        tickets=tickets,
        review=statuses().get(account_id, {"status": "Not reviewed"}),
    )


class Review(BaseModel):
    status: Literal["Not reviewed", "Investigating", "Reviewed"]


@app.put("/api/accounts/{account_id}/review")
def update_review(account_id: str, body: Review):
    _, _, f = load()
    if account_id not in set(f.account_id):
        raise HTTPException(404, "Account not found")
    statuses()
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB) as c:
        c.execute(
            "INSERT OR REPLACE INTO reviews VALUES (?,?,?)",
            (account_id, body.status, now),
        )
    return dict(status=body.status, updated_at=now)


@app.get("/api/validation")
def validation():
    p, a, _ = load()
    a["quality"] = json.loads((p / "quality.json").read_text())
    a["metadata"] = json.loads((p / "metadata.json").read_text())
    llm = ROOT / "reports/llm_comparison.json"
    if llm.exists():
        a["llm_comparison"] = json.loads(llm.read_text())
        a["llm_comparison"]["matches_current_version"] = (
            a["llm_comparison"].get("data_version") == p.parent.name
        )
    human = ROOT / "reports/human_evaluation.json"
    if human.exists():
        result = json.loads(human.read_text())
        if result.get("data_version") == p.parent.name:
            a["human_classifier"] = result["keyword"]
    stress = ROOT / "reports/stress.json"
    if stress.exists():
        a["stress"] = json.loads(stress.read_text())
    return a


@app.get("/api/health")
def health():
    return {"status": "ok"}


# A single local server serves the built React application and API.
if (ROOT / "frontend/dist").exists():
    app.mount(
        "/", StaticFiles(directory=ROOT / "frontend/dist", html=True), name="frontend"
    )
