"""Generate handoff evidence directly from the current successful version."""

import json, shutil
import pandas as pd
from .pipeline import current, ROOT, dump, rank, records
from .quality import KEYS, DATES

if __name__ == "__main__":
    v = current()
    a = json.loads((v / "derived/analysis.json").read_text())
    m = json.loads((v / "derived/metadata.json").read_text())
    q = json.loads((v / "derived/quality.json").read_text())
    f = pd.read_csv(v / "derived/historical_features.csv")
    chosen = []
    for _, g in f.groupby("cohort"):
        chosen.extend(rank(g, a["config"]).head(50).account_id)
    f["selected"] = f.account_id.isin(chosen).astype(int)
    f["resolved"] = f.renewed.notna().astype(int)
    f["renewed_count"] = (f.renewed == 1).astype(int)
    dump(ROOT / "reports/findings.json", a)
    dump(
        ROOT / "reports/artifact-input.json",
        dict(
            analysis=a,
            metadata=m,
            quality=q,
            accounts=records(
                f[
                    [
                        "account_id",
                        "cohort",
                        "annual_value",
                        "active_users",
                        "eligible_seats",
                        "resolved",
                        "renewed_count",
                        "selected",
                        "recent",
                        "previous",
                    ]
                ]
            ),
            stress=json.loads((ROOT / "reports/stress.json").read_text()),
        ),
    )
    pd.DataFrame(a["cohorts"]).drop(columns="demand").to_csv(
        ROOT / "reports/cohort_totals.csv", index=False
    )
    trace = "# Five account traces\n\nTool-assisted source inspection, not a claim of independent human annotation. The recent-event IDs below were read from cleaned source rows and reconciled with SQL. All timestamps are UTC. Re-run these yourself before claiming personal ownership.\n\n"
    trace += "| Account | Cutoff | Recent source / SQL | Previous | Active / eligible | Open severe | Requests |\n|---|---|---|---|---|---|---|\n"
    for t in a["traces"]:
        r = f[f.account_id == t["account_id"]].iloc[0]
        trace += f"| {t['account_id']} | {t['cutoff']} | {t['source_recent']} / {t['sql_recent']} | {r.previous} | {r.active_users} / {r.eligible_seats} | {r.severe_open} | {r.request_count} |\n"
    for t in a["traces"]:
        trace += f"\n## {t['account_id']}\n\nRecent source IDs: {', '.join(t['event_ids'])}. Each occurred in [T−30,T), was available at or before T and had valid licence membership.\n"
    trace += "\nSQL uses LEFT JOIN aggregates so accounts with no requests or severe tickets remain present. This trace checks the source-event count independently; automated boundary fixtures separately exercise exact T, T−30, T−60 and T−90 edges. Personal review date/sign-off: pending.\n"
    (ROOT / "reports/account-traces.md").write_text(trace)
    dictionary = "# Data dictionary\n\nAll identities and values are fictional. UTC timestamps use ISO text in CSV and TIMESTAMP in DuckDB. Each file has a header. Empty CSV cells represent null. Foreign keys listed below must resolve. Monetary values are annual USD, seats are integer counts.\n\n"
    grains = {
        "accounts": "one fictional account",
        "contracts": "one annual contract per account",
        "users": "one licensed user",
        "events": "one interaction",
        "content": "one content item",
        "support": "one support ticket",
        "client_requests": "one written request",
        "outcomes": "one contract outcome, possibly unknown",
    }
    descriptions = {
        "account_id": "Account foreign key (primary in accounts)",
        "fictional_account_name": "Fictional display name; never a real customer",
        "industry": "Technology / Manufacturing / Finance / Professional services",
        "region": "APAC / EMEA / Americas",
        "company_size": "Small / Mid-market / Enterprise, based on licensed seats",
        "account_start": "Start of account relationship, before contract start",
        "contract_id": "Contract key; outcomes foreign key",
        "start_date": "Annual contract start",
        "renewal_date": "Common first-of-month renewal date per cohort",
        "annual_value": "Positive annual subscription exposure in USD",
        "licensed_seats": "Positive allocated licence count",
        "user_id": "User key; events foreign key",
        "eligible_from": "Inclusive user licence start",
        "eligible_to": "Exclusive user licence end",
        "event_id": "Unique interaction identifier",
        "event_time": "Occurrence timestamp",
        "available_at": "Timestamp source record became observable",
        "event_type": "content_view / consultation / event_attendance",
        "content_id": "Content key; required for views, optional otherwise",
        "title": "Fictional content title",
        "topic": "One named topic from closed taxonomy",
        "format": "Article / Research brief / Webinar",
        "publication_date": "Earliest content availability",
        "ticket_id": "Support key",
        "opened_at": "Support occurrence timestamp",
        "closed_at": "Nullable closure time; future closures remain open at cutoff",
        "severity": "low / medium / severe",
        "request_id": "Request key",
        "request_time": "Written request occurrence timestamp",
        "request_text": "Untrusted fictional text, never executable instructions",
        "source_channel": "Email / Portal / Consultation; missing becomes Unknown with warning",
        "renewed": "1 renewed / 0 non-renewed / null unknown",
        "outcome_date": "Nullable decision date; not a scoring feature",
        "outcome_available_at": "Nullable outcome ingestion date; required for resolved evaluation",
    }
    for name, key in KEYS.items():
        df = pd.read_csv(v / f"raw/{name}.csv")
        dictionary += f"## {name}\n\nGrain: {grains[name]}. Primary key: `{key}`.\n\n| Field | Type / unit | Meaning and null handling |\n|---|---|---|\n"
        for col in df:
            dtype = (
                "UTC timestamp"
                if col in DATES[name]
                else (
                    "integer / numeric"
                    if pd.api.types.is_numeric_dtype(df[col])
                    else "text"
                )
            )
            dictionary += f"| {col} | {dtype} | {descriptions.get(col,col)} |\n"
    dictionary += "\n## Relationships\n\naccounts 1:1 contracts; accounts 1:many users/events/support/requests; users 1:many events; content 1:many view events; contracts 1:1 outcomes. Final features 1:1 contracts in version one. request_topics is multi-label (request_id,topic). demand_evidence is request/topic grain, not account grain; aggregate distinct account IDs for demand.\n\nRequired nulls quarantine rows. Optional content_id is permitted on non-views, closed_at on open support, and all outcome fields on pending outcomes. Missing optional channel is retained as Unknown. Dates that cannot be parsed are quarantined. Generator-only latent variables are never exported.\n"
    (ROOT / "docs/DATA_DICTIONARY.md").write_text(dictionary)
    rule = next(
        x for x in a["performance"] if x["split"] == "test" and x["method"] == "Rule"
    )
    rand = next(
        x for x in a["performance"] if x["split"] == "test" and x["method"] == "Random"
    )
    c = a["cohorts"][-1]
    findings = f"""# Measured findings\n\nBaseline seed 42, data version {m['feature_sha256'][:8]}. Generated {m['counts']['accounts']:,} accounts, {m['counts']['events']:,} raw event rows and {m['counts']['client_requests']:,} requests. The clean reference contains 100,000 events. Refresh took {m['runtime_seconds']} seconds and generated {m['bytes']/1048576:.1f} MiB before metadata files.\n\nTest cohorts August–December 2025 contain 415 accounts, 394 resolved outcomes. Rule precision: {rule['precision']:.1%} ({rule['hits']}/{rule['selected_resolved']}), recall {rule['recall']:.1%}, lift {rule['lift']:.3f}. Random precision: {rand['precision']:.1%} ({rand['hits']}/{rand['selected_resolved']}), recall {rand['recall']:.1%}, lift {rand['lift']:.3f}. Pending selections: {rule['selected_pending']} rule, {rand['selected_pending']} random. These are modest descriptive differences, not causal evidence or a proven win.\n\nDecember 2025: {c['eligible']} eligible accounts, {c['flagged']} flagged; {c['active_users']} / {c['eligible_seats']} active seats ({c['active_users']/c['eligible_seats']:.1%}); {c['consulted']} accounts consulted; {c['severe_open']} open severe tickets; selected exposure USD {c['exposure']:,.0f}. Historical renewal: {c['renewed']}/{c['resolved']} resolved ({c['renewal_rate']:.1%}), shown only in validation.\n\nQuality: {q['detected_injected']}/{q['injected']} injected anomalies detected, {q['quarantined']} rows quarantined. Keyword macro-F1 {a['classifier']['macro_f1']:.1%} on {a['classifier']['n']} generator-labelled evaluation examples, coverage {a['classifier']['coverage']:.1%}, abstention {a['classifier']['abstention_rate']:.1%}. Perfect matching of these simple templates is not credible evidence of real-language accuracy. Human annotations and LLM runs: none completed.\n"""
    (ROOT / "reports/FINDINGS.md").write_text(findings)
    print(findings)
