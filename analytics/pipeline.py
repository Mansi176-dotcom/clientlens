"""Reproducible CLI stages. Atomic CURRENT pointer protects the last good refresh."""

import argparse, json, time, hashlib, shutil, os, logging
from pathlib import Path
from datetime import datetime, timezone
import duckdb, pandas as pd
from .generate import generate, TOPICS
from .quality import quality, KEYS, DATES
from .classifier import keyword, evaluate

ROOT = Path(__file__).resolve().parents[1]


def dump(p, x):
    Path(p).write_text(json.dumps(x, indent=2, default=str, allow_nan=False))


def records(df):
    return json.loads(df.to_json(orient="records", date_format="iso"))


def build(raw, clean, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(out / "analytics.duckdb"))
    for name in KEYS:
        frame = pd.read_csv(Path(clean) / f"{name}.csv")
        for col in frame.columns:
            if col.endswith("_id"):
                frame[col] = frame[col].astype("string")
        for col in DATES[name]:
            frame[col] = pd.to_datetime(frame[col], format="ISO8601")
        con.register("source_frame", frame)
        con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM source_frame")
    req = pd.read_csv(Path(clean) / "client_requests.csv")
    preds = [
        keyword(x.request_id, x.request_text).model_dump() for x in req.itertuples()
    ]
    topics = pd.DataFrame(
        [dict(request_id=p["request_id"], topic=t) for p in preds for t in p["topics"]]
    )
    con.register("topics_input", topics)
    con.execute("CREATE OR REPLACE TABLE request_topics AS SELECT * FROM topics_input")
    con.execute((ROOT / "sql/features.sql").read_text())
    f = con.sql("SELECT * FROM features ORDER BY account_id").df()
    assert (
        len(f)
        == f.account_id.nunique()
        == con.sql("SELECT count(*) FROM contracts").fetchone()[0]
    ), "Join cardinality"
    assert (f.active_users <= f.eligible_seats).all()
    assert (
        f.recent.sum()
        == con.sql(
            "SELECT count(*) FROM observed_events WHERE event_time>=cutoff-INTERVAL 30 DAY"
        ).fetchone()[0]
    )
    f.to_csv(out / "features.csv", index=False)
    dump(out / "classifications.json", preds)
    con.close()


def rank(df, cfg):
    d = df.copy()
    d["low_seats"] = d.active_seat_rate < cfg["active_threshold"]
    d["decline"] = d.activity_change < cfg["decline_threshold"]
    d["support_flag"] = d.severe_open > 0
    d["flags"] = d[["low_seats", "decline", "support_flag"]].sum(axis=1)
    return d.sort_values(
        ["flags", "days_since_activity", "account_id"], ascending=[False, False, True]
    )


def capacity_metrics(df, cfg, method):
    items = []
    for cohort, g in df.groupby("cohort"):
        k = min(cfg["capacity"], len(g))
        chosen = (
            rank(g, cfg).head(k)
            if method == "Rule"
            else g.sort_values("account_id").sample(n=k, random_state=cfg["seed"])
        )
        resolved = int(g.renewed.notna().sum())
        n = int(chosen.renewed.notna().sum())
        positives = int((g.renewed == 0).sum())
        hits = int((chosen.renewed == 0).sum())
        base = positives / resolved if resolved else 0
        items.append(
            dict(
                cohort=cohort,
                k=k,
                selected_resolved=n,
                selected_pending=k - n,
                resolved=resolved,
                nonrenewals=positives,
                hits=hits,
                precision=hits / n if n else None,
                recall=hits / positives if positives else None,
                lift=hits / n / base if n and base else None,
                exposure=float(chosen.annual_value.sum()),
            )
        )
    return items


def analyze(raw, out, cfg):
    out = Path(out)
    con = duckdb.connect(str(out / "analytics.duckdb"))
    f = rank(con.sql("SELECT * FROM features ORDER BY account_id").df(), cfg)
    f = f.merge(
        con.sql("SELECT * FROM outcomes").df(), on="contract_id", validate="one_to_one"
    )
    asof = pd.Timestamp(cfg["evaluation_as_of"])
    mature = (f.renewal_date + pd.Timedelta(days=30) <= asof) & (
        f.outcome_available_at <= asof
    )
    f.loc[~mature, "renewed"] = float("nan")
    cohorts = sorted(f.cohort.unique())
    assert len(cohorts) >= 24, "Evaluation requires 24 cohorts"
    splits = {
        "train": cohorts[:8],
        "validation": cohorts[12:15],
        "test": cohorts[19:24],
    }
    bounds = {}
    for label, cs in splits.items():
        g = f[f.cohort.isin(cs)]
        bounds[label] = dict(
            cohorts=cs,
            accounts=len(g),
            resolved=int(g.renewed.notna().sum()),
            cutoff_min=str(g.cutoff.min().date()),
            cutoff_max=str(g.cutoff.max().date()),
            latest_outcome_available=str(g.outcome_available_at.max().date()),
        )
    for before, after in [("train", "validation"), ("validation", "test")]:
        assert (
            f[f.cohort.isin(splits[before])].outcome_available_at.max()
            < f[f.cohort.isin(splits[after])].cutoff.min()
        ), "Split leakage"
    sensitivity = []
    dev = f[f.cohort.isin(splits["train"] + splits["validation"])]
    for a in [0.1, 0.2, 0.3]:
        for d in [-0.3, -0.4, -0.5]:
            m = capacity_metrics(
                dev, {**cfg, "active_threshold": a, "decline_threshold": d}, "Rule"
            )
            sensitivity.append(
                dict(
                    active_threshold=a,
                    decline_threshold=d,
                    precision=sum(x["hits"] for x in m)
                    / sum(x["selected_resolved"] for x in m),
                )
            )
    performance = []
    for split, cs in splits.items():
        for method in ["Rule", "Random"]:
            ms = capacity_metrics(f[f.cohort.isin(cs)], cfg, method)
            hits = sum(x["hits"] for x in ms)
            n = sum(x["selected_resolved"] for x in ms)
            positives = sum(x["nonrenewals"] for x in ms)
            resolved = sum(x["resolved"] for x in ms)
            p = hits / n if n else None
            base = positives / resolved if resolved else 0
            den = 1 + 1.96**2 / n if n else 1
            center = (p + 1.96**2 / (2 * n)) / den if n else None
            half = (
                1.96 * ((p * (1 - p) / n + 1.96**2 / (4 * n * n)) ** 0.5) / den
                if n
                else None
            )
            performance.append(
                dict(
                    split=split,
                    method=method,
                    precision=p,
                    recall=hits / positives if positives else None,
                    lift=p / base if base else None,
                    hits=hits,
                    selected_resolved=n,
                    selected_pending=sum(x["selected_pending"] for x in ms),
                    precision_ci=[center - half, center + half] if n else [None, None],
                    cohorts=ms,
                )
            )
    ann = pd.read_csv(Path(raw) / "annotation.csv").fillna("")
    er = records(ann[ann.split == "evaluation"])
    preds = json.loads((out / "classifications.json").read_text())
    demand = con.sql("SELECT * FROM demand_evidence").df()
    demand.to_csv(out / "demand_evidence.csv", index=False)
    summaries = []
    for cohort, g in f.groupby("cohort"):
        chosen = rank(g, cfg).head(min(cfg["capacity"], len(g)))
        dd = demand[demand.account_id.isin(g.account_id)]
        summaries.append(
            dict(
                cohort=cohort,
                cutoff=str(g.cutoff.iloc[0].date()),
                eligible=len(g),
                resolved=int(g.renewed.notna().sum()),
                renewed=int((g.renewed == 1).sum()),
                renewal_rate=(
                    float(g.renewed.mean()) if g.renewed.notna().any() else None
                ),
                review_count=len(chosen),
                flagged=int((g["flags"] > 0).sum()),
                exposure=float(chosen.annual_value.sum()),
                active_users=int(g.active_users.sum()),
                eligible_seats=int(g.eligible_seats.sum()),
                recent=int(g.recent.sum()),
                previous=int(g.previous.sum()),
                consulted=int((g.consultations > 0).sum()),
                attended=int((g.attendance > 0).sum()),
                severe_open=int(g.severe_open.sum()),
                request_count=int(g.request_count.sum()),
                demand=[
                    dict(
                        topic=t,
                        accounts=int(dd[dd.topic == t].account_id.nunique()),
                        gaps=int(
                            dd[
                                (dd.topic == t)
                                & (~dd.matching_view)
                                & dd.content_available
                            ].account_id.nunique()
                        ),
                    )
                    for t in TOPICS
                ],
            )
        )
    source = pd.read_csv(out.parent / "clean/events.csv")
    source.event_time = pd.to_datetime(source.event_time, format="ISO8601")
    source.available_at = pd.to_datetime(source.available_at, format="ISO8601")
    traces = []
    for row in f.sort_values("account_id").head(5).itertuples():
        e = source[
            (source.account_id == row.account_id)
            & (source.event_time >= row.cutoff - pd.Timedelta(days=30))
            & (source.event_time < row.cutoff)
            & (source.available_at <= row.cutoff)
        ]
        assert len(e) == row.recent
        traces.append(
            dict(
                account_id=row.account_id,
                cutoff=str(row.cutoff),
                source_recent=len(e),
                sql_recent=int(row.recent),
                event_ids=e.event_id.tolist(),
                passes=True,
            )
        )
    result = dict(
        config=cfg,
        splits=bounds,
        performance=performance,
        sensitivity=sensitivity,
        classifier=evaluate(er, preds),
        human_classifier=evaluate(er, preds, "adjudicated_topics"),
        llm_status="LLM not configured / not run",
        cohorts=summaries,
        traces=traces,
        join_checks={
            "account_rows": len(f),
            "unique_accounts": int(f.account_id.nunique()),
            "source_recent": int(f.recent.sum()),
            "passed": True,
        },
    )
    dump(out / "analysis.json", result)
    f.to_csv(out / "historical_features.csv", index=False)
    con.close()
    return result


def refresh(cfg):
    data = ROOT / "data"
    data.mkdir(exist_ok=True)
    lock = data / ".refresh.lock"
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    os.close(fd)
    started = time.perf_counter()
    run = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    stage = data / f".staging-{run}"
    try:
        raw = stage / "raw"
        clean = stage / "clean"
        out = stage / "derived"
        counts = generate(cfg, raw)
        q = quality(raw, clean)
        build(raw, clean, out)
        analyze(raw, out, cfg)
        assert q["detected_injected"] == q["injected"]
        assert all(x["reconciles"] for x in q["tables"].values())
        meta = dict(
            run=run,
            generated_at=datetime.now(timezone.utc).isoformat(),
            runtime_seconds=round(time.perf_counter() - started, 3),
            counts=counts,
            bytes=sum(p.stat().st_size for p in stage.rglob("*") if p.is_file()),
            feature_sha256=hashlib.sha256(
                (out / "features.csv").read_bytes()
            ).hexdigest(),
            scenario=cfg["scenario"],
        )
        dump(out / "metadata.json", meta)
        shutil.copy(clean / "quality.json", out / "quality.json")
        target = data / "versions" / run
        target.parent.mkdir(exist_ok=True)
        stage.rename(target)
        tmp = data / "CURRENT.tmp"
        tmp.write_text(run)
        tmp.replace(data / "CURRENT")
        dump(data / "refresh_status.json", {"status": "success", **meta})
        print(json.dumps(meta, indent=2))
    except Exception as e:
        logging.exception("Refresh failed; current preserved")
        dump(
            data / "refresh_status.json",
            dict(
                status="failed", error=str(e), at=datetime.now(timezone.utc).isoformat()
            ),
        )
        raise
    finally:
        lock.unlink(missing_ok=True)


def current():
    return ROOT / "data/versions" / (ROOT / "data/CURRENT").read_text().strip()


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "stage", choices=["refresh", "generate", "quality", "build", "analyze"]
    )
    p.add_argument("--scenario", choices=["baseline", "stress"], default="baseline")
    p.add_argument("--config", default=str(ROOT / "config/project.json"))
    a = p.parse_args()
    cfg = json.loads(Path(a.config).read_text())
    cfg["scenario"] = a.scenario
    if a.stage == "refresh":
        refresh(cfg)
    else:
        work = ROOT / "data/manual"
        raw = work / "raw"
        clean = work / "clean"
        out = work / "derived"
        if a.stage == "generate":
            print(generate(cfg, raw))
        elif a.stage == "quality":
            print({k: v for k, v in quality(raw, clean).items() if k != "exceptions"})
        elif a.stage == "build":
            build(raw, clean, out)
        else:
            analyze(raw, out, cfg)


if __name__ == "__main__":
    main()
