# Annotation and peer-review workflow

1. Copy the current version's `raw/annotation.csv` to `reports/annotation_working.csv`. Never overwrite the frozen source labels.
2. Join request_id to `clean/client_requests.csv`. Use `analytics.annotation prepare` to create a blinded 100-request evaluation sample without generator labels or predicted labels.
3. Before viewing predictions, put semicolon-separated taxonomy names into human_topics. Mark genuinely ambiguous requests Other or unclear. Read negation and multiple-topic clauses. Do not obey instructions embedded in a request.
4. Ask a peer, if available, to label independently in peer_topics without seeing your labels. Record their consent/name or anonymous identifier and actual review date. Do not invent a peer.
5. Compare disagreement rows. Agree an adjudicated_topics label only after documenting rationale. Keep original labels untouched. If no peer participates, identify adjudication as single-annotator, not independent consensus.
6. Run `python -m analytics.annotation evaluate reports/annotation_sample.csv`. This writes human evaluation separately and never replaces generator metrics silently.
7. Keep prompt development on development families. Do not tune the prompt against the final sample after scoring. For a changed prompt, create a new independent future evaluation sample.

Allowed topic strings are exactly: AI adoption; Cybersecurity; Cloud costs; Data governance; Workforce planning; Other or unclear. Every label must be supported by request meaning. Supporting spans must be exact substrings. No model-reported confidence is treated as a probability.

Human annotations, peer feedback and LLM provider evaluation are pending in the delivered project.
