"""Rules applied to all sources. Every excluded row is persisted with reasons."""

import json
from pathlib import Path
import pandas as pd

KEYS = {
    "accounts": "account_id",
    "contracts": "contract_id",
    "users": "user_id",
    "events": "event_id",
    "content": "content_id",
    "support": "ticket_id",
    "client_requests": "request_id",
    "outcomes": "contract_id",
}
DATES = {
    "accounts": ["account_start"],
    "contracts": ["start_date", "renewal_date"],
    "users": ["eligible_from", "eligible_to"],
    "events": ["event_time", "available_at"],
    "content": ["publication_date"],
    "support": ["opened_at", "available_at", "closed_at"],
    "client_requests": ["request_time", "available_at"],
    "outcomes": ["outcome_date", "outcome_available_at"],
}
OPTIONAL = {
    "events": ["content_id"],
    "support": ["closed_at"],
    "client_requests": ["source_channel"],
    "outcomes": ["renewed", "outcome_date", "outcome_available_at"],
}


def quality(raw, clean):
    raw = Path(raw)
    clean = Path(clean)
    clean.mkdir(exist_ok=True, parents=True)
    frames = {k: pd.read_csv(raw / f"{k}.csv", keep_default_na=False) for k in KEYS}
    exceptions = []
    counts = {}
    quarantine = []
    for name, df in frames.items():
        original = df.copy()
        bad = set()
        reasons = {i: [] for i in df.index}

        def mark(mask, reason, exclude=True):
            for i in df.index[mask]:
                if reason not in reasons[i]:
                    reasons[i].append(reason)
                if exclude:
                    bad.add(i)

        mark(df[KEYS[name]].duplicated(keep="first"), "duplicate_key")
        for col in df.columns:
            if col not in OPTIONAL.get(name, []):
                mark(df[col].eq(""), "required_null")
        for col in DATES[name]:
            parsed = pd.to_datetime(df[col], errors="coerce", format="ISO8601")
            mark(df[col].ne("") & parsed.isna(), "malformed_date")
            df[col] = parsed
        if name == "client_requests":
            mark(df.source_channel.eq(""), "missing_optional", False)
            df.loc[df.source_channel.eq(""), "source_channel"] = "Unknown"
        if "account_id" in df and name != "accounts":
            mark(~df.account_id.isin(frames["accounts"].account_id), "orphan_reference")
        if name == "contracts":
            mark(
                (df.annual_value <= 0)
                | (df.licensed_seats <= 0)
                | (df.start_date >= df.renewal_date),
                "range_error",
            )
            mark(df.account_id.duplicated(), "duplicate_account_contract")
        if name == "users":
            mark(df.eligible_from >= df.eligible_to, "date_order")
        if name == "events":
            user = frames["users"].set_index("user_id")
            mark(~df.user_id.isin(user.index), "orphan_reference")
            mark(
                df.user_id.map(user.account_id).ne(df.account_id)
                & df.user_id.isin(user.index),
                "invalid_user",
            )
            lo = pd.to_datetime(df.user_id.map(user.eligible_from))
            hi = pd.to_datetime(df.user_id.map(user.eligible_to))
            mark((df.event_time < lo) | (df.event_time >= hi), "unlicensed_user")
            mark(
                ~df.event_type.isin(
                    ["content_view", "consultation", "event_attendance"]
                ),
                "range_error",
            )
            mark(
                df.event_type.eq("content_view")
                & ~df.content_id.isin(frames["content"].content_id),
                "orphan_reference",
            )
            pub = pd.to_datetime(
                df.content_id.map(
                    frames["content"].set_index("content_id").publication_date
                )
            )
            mark(
                df.event_type.eq("content_view") & (df.event_time < pub),
                "unpublished_content",
            )
        if name == "support":
            mark(df.closed_at.notna() & (df.closed_at < df.opened_at), "date_order")
            mark(~df.severity.isin(["low", "medium", "severe"]), "range_error")
        if name == "outcomes":
            mark(
                ~df.contract_id.isin(frames["contracts"].contract_id),
                "orphan_reference",
            )
            mark(
                ~df.renewed.astype(str).isin(["", "0.0", "1.0", "0", "1"]),
                "range_error",
            )
            mark(
                (df.renewed.astype(str).ne(""))
                & (df.outcome_date.isna() | df.outcome_available_at.isna()),
                "required_null",
            )
            mark(df.outcome_available_at < df.outcome_date, "availability_before_event")
        if name in ["events", "client_requests", "support"]:
            timecol = {
                "events": "event_time",
                "client_requests": "request_time",
                "support": "opened_at",
            }[name]
            mark(df.available_at < df[timecol], "availability_before_event")
            mark(
                (df.available_at - df[timecol]).dt.total_seconds() > 7 * 86400,
                "late_arrival",
                False,
            )
        for i, rs in reasons.items():
            for reason in rs:
                exceptions.append(
                    dict(
                        table=name,
                        row=int(i),
                        key=str(df.loc[i, KEYS[name]]),
                        reason=reason,
                        action="quarantine" if i in bad else "retain_warning",
                    )
                )
            if i in bad:
                quarantine.append(
                    dict(
                        table=name,
                        row=int(i),
                        reasons=rs,
                        record=json.loads(original.loc[i].to_json(date_format="iso")),
                    )
                )
        out = df.drop(index=list(bad))
        out.to_csv(clean / f"{name}.csv", index=False)
        frames[name] = out
        counts[name] = dict(
            raw=len(df),
            accepted=len(out),
            quarantined=len(bad),
            reconciles=len(df) == len(out) + len(bad),
        )
    expected = json.loads((raw / "injected_faults.json").read_text())
    detected = {(x["table"], x["row"], x["reason"]) for x in exceptions}
    report = dict(
        tables=counts,
        exceptions=exceptions,
        injected=len(expected),
        detected_injected=sum(
            (x["table"], x["row"], x["reason"]) in detected for x in expected
        ),
        quarantined=len(quarantine),
        warnings=sum(x["action"] == "retain_warning" for x in exceptions),
    )
    (clean / "quality.json").write_text(json.dumps(report, indent=2))
    (clean / "quarantine.json").write_text(json.dumps(quarantine, indent=2))
    return report
