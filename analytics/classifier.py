import re
from pydantic import BaseModel, ConfigDict, field_validator
from .generate import TOPICS

KEYWORDS = {
    "AI adoption": ["ai adoption", "intelligent assistants"],
    "Cybersecurity": ["cybersecurity", "ransomware"],
    "Cloud costs": ["cloud costs", "infrastructure spend"],
    "Data governance": ["data governance", "data definitions"],
    "Workforce planning": ["workforce planning", "talent pipeline"],
}


class Classification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: str
    topics: list[str]
    supporting_spans: list[str]
    needs_review: bool

    @field_validator("topics")
    @classmethod
    def closed_taxonomy(cls, v):
        if not v or len(v) != len(set(v)) or any(x not in TOPICS for x in v):
            raise ValueError("Use unique topics from the closed taxonomy")
        return v

    def verify(self, request_id, text):
        if self.request_id != request_id:
            raise ValueError("Mismatched request id")
        if any(s not in text for s in self.supporting_spans):
            raise ValueError("Unsupported evidence span")
        if not self.needs_review and not self.supporting_spans:
            raise ValueError("Evidence required for non-abstention")
        return self


def keyword(request_id, text):
    topics = []
    spans = []
    # Sentence-level negation: conservative exclusion, not a complete language parser.
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if re.search(r"\b(not|no|never)\b", sentence, re.I):
            continue
        for topic, words in KEYWORDS.items():
            for word in words:
                match = re.search(r"\b" + re.escape(word) + r"\b", sentence, re.I)
                if match:
                    if topic not in topics:
                        topics.append(topic)
                    spans.append(match.group())
                    break
    return Classification(
        request_id=request_id,
        topics=topics or [TOPICS[-1]],
        supporting_spans=spans,
        needs_review=not bool(topics),
    )


def evaluate(rows, predictions, label_col="generator_topics"):
    stats = []
    byid = {p["request_id"]: p for p in predictions}
    labelled = [r for r in rows if r.get(label_col)]
    for topic in TOPICS:
        tp = fp = fn = 0
        for row in labelled:
            true = topic in row[label_col].split(";")
            pred = topic in byid.get(row["request_id"], {}).get("topics", [])
            tp += int(true and pred)
            fp += int(not true and pred)
            fn += int(true and not pred)
        p = tp / (tp + fp) if tp + fp else 0
        r = tp / (tp + fn) if tp + fn else 0
        stats.append(
            dict(
                topic=topic,
                precision=p,
                recall=r,
                f1=2 * p * r / (p + r) if p + r else 0,
                support=tp + fn,
            )
        )
    n = len(labelled)
    valid = [byid[r["request_id"]] for r in labelled if r["request_id"] in byid]
    return dict(
        label_source=label_col,
        n=n,
        topics=stats,
        macro_f1=sum(s["f1"] for s in stats) / len(stats),
        coverage=sum(not x["needs_review"] for x in valid) / n if n else None,
        abstention_rate=sum(x["needs_review"] for x in valid) / n if n else None,
        json_validity=len(valid) / n if n else None,
    )
