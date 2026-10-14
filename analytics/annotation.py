import argparse, json
import pandas as pd
from .pipeline import current, ROOT, dump
from .classifier import evaluate
from .generate import TOPICS

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("action", choices=["prepare", "evaluate"])
    p.add_argument(
        "file", nargs="?", default=str(ROOT / "reports/annotation_sample.csv")
    )
    a = p.parse_args()
    v = current()
    if a.action == "prepare":
        ann = pd.read_csv(v / "raw/annotation.csv").fillna("")
        req = pd.read_csv(v / "clean/client_requests.csv")
        d = (
            ann[ann.split == "evaluation"]
            .sample(n=100, random_state=42)[
                ["request_id", "human_topics", "peer_topics", "adjudicated_topics"]
            ]
            .merge(req[["request_id", "request_text"]], on="request_id")
        )
        d["reviewer"] = ""
        d["review_date"] = ""
        d["rationale"] = ""
        d.to_csv(a.file, index=False)
        print("Blinded sample saved:", a.file)
    else:
        d = pd.read_csv(a.file).fillna("")
        if d.request_id.duplicated().any():
            raise ValueError("Duplicate request IDs")
        for col in ["human_topics", "peer_topics", "adjudicated_topics"]:
            for label in d[col]:
                if label and any(t not in TOPICS for t in label.split(";")):
                    raise ValueError("Invalid topic label")
        preds = json.loads((v / "derived/classifications.json").read_text())
        both = d[(d.human_topics != "") & (d.peer_topics != "")]
        disagree = both[
            both.apply(
                lambda r: set(r.human_topics.split(";"))
                != set(r.peer_topics.split(";")),
                axis=1,
            )
        ]
        dump(
            ROOT / "reports/human_evaluation.json",
            {
                "data_version": v.name,
                "keyword": evaluate(d.to_dict("records"), preds, "adjudicated_topics"),
                "independent_pairs": len(both),
                "disagreements": len(disagree),
                "agreement": 1 - len(disagree) / len(both) if len(both) else None,
            },
        )
        disagree.to_csv(ROOT / "reports/disagreements.csv", index=False)
