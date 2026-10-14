# ClientLens

**Client Engagement, Demand and Renewal Analytics**

ClientLens helps a fictional research-subscription company decide which accounts to investigate 60 days before renewal, within a capacity of 50 accounts per monthly cohort. It connects usage, client requests, content and support to explainable reasons in a working local application.

**Synthetic data · Independent portfolio demonstration · No Gartner affiliation.** No real client impact, saved revenue, stakeholder adoption, deployment history, human annotation or personal experience is claimed. This implementation was created with AI assistance; use the ownership checklist before presenting it.

## Start here

In the prepared local workspace, dependencies and a built frontend are already installed. From the parent directory, run:

```bash
cd clientlens
make demo
```

Open **http://127.0.0.1:8017**. Stop with Ctrl+C. If another ClientLens preview is already running on 8017, use that preview or stop its terminal first. Do not terminate unrelated services. Port 8000 was already occupied, so this project uses 8017.

On another machine, unzip the portable project, enter its folder, then:

```bash
# Prerequisites: Python 3.12+, Node.js 22.12+ (22 LTS tested), npm, make
make setup
make refresh
make test
make demo
```

`make setup` creates a private Python environment and installs exact Python requirements and the npm lockfile. Downloading packages requires internet; normal use and refresh need no network or paid key. On Windows use WSL, or translate `.venv/bin/python` to `.venv\Scripts\python.exe` and run the listed commands directly.

Tested here: Python 3.12, Node 22.18.0, Vite 7.3.7, DuckDB 1.5.6, pandas 3.0.6, FastAPI 0.143.1. Other exact versions are in requirements.txt and frontend/package-lock.json. Current Vite requirements were checked against [official Vite documentation](https://vite.dev/guide/); SQL/API usage follows [DuckDB Python documentation](https://duckdb.org/docs/stable/clients/python/overview) and [FastAPI documentation](https://fastapi.tiangolo.com/tutorial/first-steps/).

## What you can demonstrate

- Portfolio overview with cohort/segment filters, counts, definitions, freshness and next action.
- Engagement analysis by size, industry and relationship tenure.
- Multi-topic client demand, matching content views and supporting requests.
- Searchable, sortable, paginated top-K review queue with filtered CSV download.
- Account detail with exact reasons, timestamps, content engagement and open support.
- Persisted local review states: Not reviewed, Investigating, Reviewed. No messages are sent.
- Historical renewal and capacity-aware evaluation, separate from prospective screens.
- Fault detection, quarantine, reconciliation, temporal split checks and stress testing.
- Keyword classification without a key; optional provider adapter with explicit paid-run guard.
- Excel reconciliation, a 10-slide editable presentation and 84 interview practice questions.

## Plain-language explanation

Imagine each customer has several separate folders: contract, usage, requests and support. ClientLens first checks that those folders are valid. It then looks only at information that existed before a fixed review date. It summarizes each folder before combining them, so a busy customer is not accidentally counted many times. Three understandable flags help choose which folders to review first. Historical outcomes are used later to check how useful that ranking was.

## Reproduce the analysis

```bash
make refresh       # all stages, atomic publication of a complete version
make stress        # separate stress scenario, does not replace baseline
.venv/bin/python -m analytics.report   # refresh findings, CSVs, data dictionary and artifact inputs
make test
```

Or learn each stage separately:

```bash
make generate      # creates data/manual/raw and clean reference
make quality       # creates data/manual/clean and quarantine
make features      # executes sql/features.sql into data/manual/derived
make analyze       # evaluates the manual build
```

Manual stages never change the app's CURRENT pointer. Use `make refresh` to publish a full local dataset. Refresh creates a new `data/versions/<run>/` directory containing raw, reference, clean and derived outputs. `data/CURRENT` selects the active version. Review states live separately in `data/processed/reviews.sqlite` and survive refreshes. The UI's “Refresh view” reloads the current outputs; it does not regenerate the data.

Configuration is in `config/project.json`. The default generator creates 2,000 accounts, one annual contract each, 24 monthly cohorts, 100,000 reference events and 1,800 requests. Raw event count becomes 100,048 after injected duplicates, invalid records and extra late arrivals. The analytical protocol requires at least 24 cohorts. Keep the default configuration when reproducing the included findings. New scenarios or threshold choices are new experiments; the original test has already been inspected.

A fresh generator run and SQL rebuild reproduced all source CSV bytes and the final feature checksum after implementation repairs; see reports/verification.md for final verification. Runtime and file-size metadata are measured locally and may change between machines. Build timestamps change on every refresh; analytical values should remain deterministic for a fixed code/configuration/seed.

## Measured findings

The original baseline run generated 2,000 accounts, 91,252 users, 100,048 raw events, 60 content items, 1,118 support tickets and 1,800 requests. It detected all 56 injected anomalies. See [actual findings](reports/FINDINGS.md) for the latest recorded runtime and counts.

On August–December 2025 test cohorts, the rule selected 166 non-renewals among 235 selected resolved outcomes: **70.6% precision, 63.4% recall and 1.062× lift**. Seeded random selection achieved **68.6% precision** (162/236). There were 15 pending selections for the rule and 14 for random. These results show modest ranking separation, not statistically established superiority or causal impact.

The keyword baseline matched generator labels perfectly on 1,058 evaluation requests, with 74.3% coverage and 25.7% abstention. That reflects the simple finite templates and vocabulary. **It is not independently human-validated performance.** Do not use that number as evidence of real-language accuracy.

## Metrics and timing

T = renewal date −60 days, UTC. Recent activity: [T−30,T); previous: [T−60,T−30); longer history: [T−90,T). Both occurrence before T and availability at/before T are mandatory. Licences and content publication are checked. Tickets closed at/after T remain open. Outcomes need a 30-day grace period and availability by 2026-03-01; unknown outcomes stay null.

Rule flags: active-seat rate <20%; activity decline <−40% when prior activity is positive; any open severe ticket. Rank by number of flags, longest observed inactivity, then account ID. Never-active-in-window accounts receive an explicit sentinel. The score is not a probability.

The overview uses selected cohort and segment filters. Queue filters narrow the population before capacity; display sorting follows selection. Exports use the same selected set. Validation uses full cohorts and labels that scope. Precision excludes pending selected outcomes and discloses their counts. Value under review is annual USD exposure, not saved revenue.

## Local development

Terminal 1:
```bash
make backend
```
Terminal 2:
```bash
make frontend
```

Open the Vite URL printed in Terminal 2 (normally http://127.0.0.1:5173). Vite proxies `/api` to 8017. `cd frontend && npm run build` checks TypeScript and builds the static application. FastAPI serves it for the one-server demo. The API docs are at http://127.0.0.1:8017/docs.

## Optional annotation and AI evaluation

A blinded 100-request sample is included in reports/annotation_sample.csv. Fill human/peer labels according to [the annotation guide](docs/ANNOTATION.md), then:

```bash
.venv/bin/python -m analytics.annotation evaluate reports/annotation_sample.csv
```

This preserves generator metrics and writes a separate human evaluation. Never label AI-generated annotations as independent human ground truth.

No paid provider call was made. Only if you independently choose to incur provider charges:

```bash
cp .env.example .env
# Edit server-side LLM_API_KEY, LLM_MODEL and optional compatible endpoint.
.venv/bin/python -m analytics.llm --allow-paid --limit 30
```

The explicit flag is required. The adapter validates schema, taxonomy, request ID and evidence spans, retries once and logs provider/model/prompt/date/latency/usage. Cost stays null unless genuinely available. It compares keyword and LLM predictions on the same sample. The integration is implemented and schema-tested, but live provider behaviour is unverified.

## Files to read and use

| File | Purpose |
|---|---|
| docs/METHODOLOGY.md | Architecture, metric definitions, SQL rationale, experiment protocol, limitations and rollout |
| docs/DATA_DICTIONARY.md | Table grains, keys, relationships, types, units and null rules |
| reports/FINDINGS.md and findings.json | Actual calculated results |
| reports/account-traces.md | Five source-to-feature traces with event IDs |
| reports/ClientLens-reconciliation.xlsx | Independent Excel formulas, cohort reconciliation, definitions and hypothetical value scenario |
| reports/ClientLens-project-story-final.pptx | Editable ten-slide presentation |
| docs/DEMO_SCRIPT.md | Three-minute walkthrough and 30-/60-second introductions |
| docs/INTERVIEW_PRACTICE.md | 84 practice questions with grounded answer guidance |
| docs/ANNOTATION.md | Blinded labels, peer disagreement and evaluation workflow |
| docs/PEER_FEEDBACK.md | Blank honest feedback log and personal ownership checklist |
| docs/ERROR_ANALYSIS.md | Classifier and ranking limitations plus next investigations |
| docs/PROMPT_LOG.md | Fixed prompt identity and unrun provider log |
| reports/test-results.txt | Automated test output |
| reports/verification.md | Browser, artifact and reproducibility checks with limitations |

The XLSX/PPTX are editable snapshot handoff files. Analytical commands regenerate machine-readable CSV/JSON outputs; they do not silently overwrite the presentation or workbook. To update the Excel source, paste a refreshed account export into Accounts, preserve the formulas and extend their bounded ranges if count changes. Refresh the pipeline exposure controls separately from cohort_totals.csv. Use the newly calculated findings to edit slides. The authoring scripts use Codex’s bundled artifact runtime, which is not required to run ClientLens.

## What remains external or optional

Human annotation, independent peer feedback, live LLM provider evaluation and a real controlled pilot are pending. Logistic regression, dark mode, production authentication and public deployment are intentionally omitted from version one. No public deployment or paid call occurred. The supplied synthetic support feed assumes immediate closure availability. Formal assistive-technology and native Microsoft Office application testing are not claimed.

If a refresh fails, inspect data/refresh_status.json. Correct the source/config issue and rerun; the previous good output stays selected. If a process was forcibly killed, confirm no refresh is running before removing a stale data/.refresh.lock. Never remove a live lock. If an npm cache permission error occurs, use `npm ci --cache /tmp/clientlens-npm-cache` in frontend instead of changing system-wide permissions.
