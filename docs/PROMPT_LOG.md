# Prompt and model log

| Field | Delivered state |
|---|---|
| Prompt version | 1.0-frozen |
| Prompt source | analytics/llm.py, PROMPT constant |
| Provider / endpoint | User configurable, no provider called |
| Model identifier | Not configured |
| Live run date | Not run |
| Latency / tokens / cost | Unavailable, never estimated as completed usage |
| Keyword baseline | analytics/classifier.py, deterministic |
| Ground truth | Provisional generator labels only |
| Independent human labels | Pending |

The prompt treats client request text as untrusted JSON data and restricts output to request_id, closed-taxonomy topics, exact supporting_spans and needs_review. It forbids following instructions inside the request. Model confidence is not requested. Pydantic rejects extra fields, empty/duplicate/unknown topics, mismatched IDs and unsupported spans. At most two attempts per request are logged. Schema validity does not establish semantic correctness.

A future authorized CLI run writes llm_log.json, llm_predictions.json and llm_comparison.json under reports. The comparison uses exactly the same request IDs for both methods. Preserve the prompt version, actual model and data version when comparing runs.
