# ClientLens methodology

Independent portfolio demonstration using fictional identities and synthetic data. No Gartner product, engagement, partnership, internal system or branding is implied. The internship alignment follows the capabilities in the supplied request, not a separately verified job advertisement.

## Decision and architecture

A fictional research subscription team has capacity for 50 account reviews per monthly renewal cohort. All contracts in a cohort renew on the first of the month. Score at T = renewal date −60 days. Review reasons help an analyst ask questions; they do not prescribe outreach or predict its benefit.

React / TypeScript / Vite renders the local interface. Tailwind is integrated, with a small custom CSS component system using native accessible form controls. Recharts provides labelled charts. FastAPI serves the API and built frontend. DuckDB executes readable SQL in `sql/features.sql`. pandas provides source cleaning and evaluation. SQLite stores demonstration review statuses independently of analytical refreshes. Credentials stay server-side. No external API call occurs on refresh or application startup.

Pipeline: generator → immutable clean reference plus faulty raw export → checks and quarantine → clean CSV → DuckDB observation tables → separately aggregated facts → account features → deterministic review ranking → held-out evaluation → versioned outputs. `data/CURRENT` points to the last fully successful version. A filesystem lock prevents overlapping refreshes. A failure records the error without changing CURRENT. The UI marks failed refreshes or builds older than 24 hours stale. This is a local prototype, without authentication, distributed locks, monitoring infrastructure or production backups.

## Frozen experiment protocol

Defaults in `config/project.json` and formulas in `analytics/generate.py` are the generation assumptions. Seed 42, 2,000 accounts, 24 cohorts, 100,000 clean events, 1,800 requests. Annual values are fictional USD. Content views use an edition published by the event time, falling back to the earliest edition of the same topic without another random draw. The baseline generator uses latent health and activity trend, severe support and independent Gaussian noise in a logistic renewal draw. Latent health and trend are never exported or made available as analytical features. The stress generator weakens the health relationship, reverses the trend coefficient and adds more noise. Both scenarios use the same frozen rule thresholds; they were not adjusted to make a method win.

Model selection: no ML model is fitted in version one. The initial rule is retained a priori. The 3×3 threshold grid is reported on training/validation only, not used to select a test winner. One deterministic random selection comparator uses seed 42. A single random draw is an educational baseline, not a precise estimate of expected random performance. Repeated random draws or paired cohort bootstrap would improve uncertainty estimation in a later version.

Train renewal cohorts: January–August 2024. Validation: January–March 2025. Test: August–December 2025. Gap cohorts remain visible in the app but are excluded from reported split evaluation. Every available outcome from an earlier split must precede the first scoring date in the next split. Exact retained counts and dates appear in `reports/findings.json` and Validation. Test outcomes are read only after fixed-rule development calculations. Future research changes must use a new experiment and disclose that this test has already been seen.

## Time, eligibility and denominators

All source timestamps represent UTC, stored without timezone suffixes. Recent window is [T−30 days,T), previous [T−60,T−30), longer [T−90,T). Occurrence must be before T and availability at or before T. The left edge is included and right edge excluded. A record occurring exactly at T is excluded, even if immediately available. A late record stays in clean data but contributes only if known by T.

Accounts: one valid annual contract per account in the selected renewal cohort and segments. Every generated contract covers its observation period. Events additionally require a user belonging to the same account, valid event-time licence eligibility, and published matching content for content views. Active users must also be eligible at T. The seat denominator is the number of users eligible at T, not a sum of events. Contract seat allocations and user counts agree in the generator. A real source may need reconciliation between allocated, provisioned and eligible seats.

Support has occurrence/availability gating. A closure at or after T counts as open. The data assumes closure knowledge is immediate at closed_at; there is no separate closure ingestion timestamp. With delayed source updates, production support would need a bitemporal status history. API detail suppresses future closure timestamps.

Outcomes are resolved only when renewal +30 days is at or before the evaluation date and outcome_available_at is known by that date. Pending rows retain nulls and never become non-renewals. The evaluation date is fixed at 2026-03-01, independent of the machine clock. All 24 cohorts are mature in calendar time, but some outcomes remain deliberately unknown.

| Metric | Numerator | Denominator / interpretation |
|---|---|---|
| Eligible accounts | Distinct valid accounts | Selected cohort and segment filters |
| Historical renewal rate | Renewed resolved contracts | Resolved eligible contracts after grace and availability |
| Active-seat rate | Distinct recent active users also eligible at T | Users eligible at T; pooled for segments |
| Activity change | Recent events − previous events | Previous events; null if zero |
| Consultation coverage | Accounts with ≥1 observed consultation in 90 days | Eligible accounts |
| Event coverage | Accounts with ≥1 observed event attendance in 90 days | Eligible accounts |
| Open severe support | Severe tickets opened and known before T, not closed before T | Count, not rate |
| Topic demand | Distinct accounts requesting a topic in 90 days | Eligible accounts in the same cohort and filters |
| Classification coverage | Requests assigned a named topic | Observed requests; Other/unclear is an abstention |
| Precision at K | Selected resolved non-renewals | Selected resolved outcomes; also disclose pending selected |
| Recall at K | Selected resolved non-renewals | All resolved non-renewals in evaluated cohort(s) |
| Lift at K | Precision at K | Resolved non-renewal prevalence in evaluated cohort(s) |
| Annual value under review | Sum annual value of selected top K | USD exposure, never revenue saved |
| Data freshness | Build age, success status, latest included source timestamps | Build age is not proof of source-system completeness |

For previous=0 and recent>0, show New activity. For both zero, show Persistent inactivity. Never divide by zero. Unknown percentages display an em dash. Topic shares can exceed 100% in total because an account can request several topics. The app exposes exact counts alongside rates.

## Rule, tie-breaks and review filters

One point each for active-seat rate <20%, activity change <−40% when previous>0, and at least one open severe ticket. Rank by descending flags, descending days since latest activity in the observed 90 days, then ascending account_id. No activity in that window receives 999 days as an explicit sentinel and ranks first among ties. This means never active **within the observed window**, not lifetime inactivity.

Capacity K=min(configured capacity, filtered eligible count), up to 50. The queue applies cohort, segment, search, flag and local status filters before capacity selection. Sort-by-value/name changes presentation after selection, not the selected set. Export contains all selected rows, not only the visible page. Historical evaluation always uses full cohorts at K≤50, independent of interactive segment/search filters. The prospective overview excludes future outcomes; use Validation for historical renewal rates.

## Data quality and reconciliation

Unique keys are checked across all eight tables. Exact duplicate event IDs keep the first row in stable source order; subsequent rows are quarantined. Conflicting duplicates in a real feed should be escalated rather than resolved by this educational first-row rule. Required nulls, malformed timestamps, parent references, licence membership, invalid event types, ranges and date ordering produce exceptions. Missing optional request channel becomes Unknown, with a warning. Ingestion delays >7 days are retained with warnings. Injected faults are compared on table + source row + reason; naturally occurring warnings remain visible separately.

Every source row is either accepted or quarantined. `raw=accepted+quarantined` must hold, and the quarantine retains original values and reasons. Events, requests and tickets aggregate separately before joining to the account spine. Feature cardinality must equal contract count and distinct account count. Active users cannot exceed eligible users. Recent-event totals independently reconcile to filtered source events. `reports/account-traces.md` records five source-to-feature traces.

## Text classification and content matching

Closed taxonomy: AI adoption, Cybersecurity, Cloud costs, Data governance, Workforce planning, Other or unclear. The keyword baseline matches explicit phrases and a few curated synonyms; it skips sentences containing not/no/never. This conservative heuristic can discard a valid topic in mixed-negation sentences. It does not understand sarcasm or implicit domain context.

Development template families: direct, planning, multiple-topic. Evaluation families: paraphrase, negation, unclear, adversarial. Template family separation prevents identical templates across splits. Vocabulary overlaps by design and the finite generator remains simplistic. Perfect generator-label scores do not establish real-language accuracy. No independently human-labelled ground truth is included.

Optional LLM CLI uses a configurable chat-completions-compatible provider, a fixed prompt version, a closed Pydantic schema and exact evidence-span validation. Request text is encoded as untrusted JSON data. The system prompt rejects embedded instructions. At most two attempts per request; failures are logged. Logs include endpoint/provider, model, UTC run date, prompt version, latency, usage if returned, and unavailable cost as null. Cost is not guessed. There is no confidence field. Schema success cannot prove semantic safety, and adversarial examples are a test, not a security guarantee.

No provider calls were performed in this handoff. An API key and explicit `--allow-paid` are needed. `reports/llm_comparison.json`, when generated, compares both methods on exactly the same requested evaluation IDs and keeps absent/invalid outputs as failures. CLI errors and per-request abstention rates must be considered alongside macro-F1. Human adjudication remains separate from provisional generator labels.

A content gap means a named requested topic has published content but no observed view of matching-topic content in the 90-day window. Matching views can precede the request, so this is a contemporaneous engagement comparison, not response attribution. The classifier and content taxonomy can both be wrong. The interface shows request text and timestamps for investigation.

## Proposed rollout and impact test

Shadow mode (proposed analyst owner): rerun quality checks, inspect five accounts, verify freshness and capacity. Critical integrity failures halt a new version; retain and label the previous output. Human review (proposed client-services and content owners): check signal explanations, annotate requests independently, and adjudicate disagreements before enabling AI-assisted categories.

Small controlled pilot (proposed experiment owner): define a consistent outreach protocol and business-as-usual comparator, randomize at account level before contact, stratify by cohort/size where appropriate, and prevent account crossover. Analyse intention-to-treat renewal outcomes after the 30-day grace and availability lag. Predefine treatment of unknown outcomes, minimum useful absolute renewal effect, review cost, staff time, and complaint opt-out guardrails. Stop or revise for harmful complaints, excessive cost or broken data.

Sample-size planning should use a real baseline renewal rate and minimum detectable effect, alpha (e.g. 0.05) and power (e.g. 0.80). A simple equal-arm approximation is n≈2(z_alpha/2+z_power)^2 p(1−p)/delta^2 per arm; use exact software planning for the final design and allow for missing outcomes and cohort effects. The 50-account monthly capacity can make a small-effect experiment slow. Do not claim the portfolio itself is powered to detect real impact.

Monitor drift, missingness, false discovery gaps, abstentions, costs and complaints. Revisions get new prompt/data versions and future evaluation cohorts. Hypothetical business-value assumptions in Excel are separate from observed synthetic results.
