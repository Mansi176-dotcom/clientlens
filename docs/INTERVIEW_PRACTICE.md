# Interview practice: ClientLens

These are practice questions, not confirmed Gartner interview questions. Use the answers as guidance, not a memorized claim of experience. Replace bracketed personal details honestly. This project was implemented with AI assistance. Distinguish reviewing and learning the code from having independently written every component.

## Business framing

1. **What problem does ClientLens solve?** A subscription team has more renewing accounts than it can review. ClientLens combines usage, requests and support evidence into a capacity-limited queue 60 days before renewal.
2. **Who would use it?** A proposed client-services analyst would review reasons. A content specialist could investigate demand gaps. These are proposed users; nobody has adopted this demonstration.
3. **Why 50 accounts?** It is the educational monthly capacity assumption. Capacity-aware metrics test the ranking where a team would actually act.
4. **Why score 60 days early?** It creates a consistent lead time for investigation. It is an assumption to validate with a real operational team.
5. **Why a common renewal date?** Every account in a cohort gets scored at the same decision point. This avoids comparing accounts with different amounts of remaining lead time.
6. **What decision should the dashboard not make?** It should not automatically contact or cancel clients, promise savings, or equate non-renewal association with responsiveness to outreach.
7. **How do you define success?** Technical success is reproducible correct data and useful evidence. Real success would require a controlled pilot showing a worthwhile renewal effect under cost and complaint guardrails.
8. **What would you clarify with a stakeholder?** Review capacity, licence definitions, lead time, renewal maturity, acceptable data delays, what outreach is possible, and who owns exceptions.

## SQL and data modelling

9. **What is the grain of the final table?** One annual contract/account at its cutoff. Version one has one contract per account; a multi-contract version needs contract_id and cutoff as its grain.
10. **Why aggregate before joining?** Ten events joined to three requests and two tickets can create 60 rows. Separate account-level aggregates avoid multiplied denominators and support counts.
11. **When do you use LEFT JOIN?** The account spine must retain accounts with no events or tickets. LEFT JOIN makes their observed counts zero while preserving eligibility.
12. **Why COUNT(event_id) instead of COUNT(*)?** With an unmatched LEFT JOIN, COUNT(*) counts the placeholder row. COUNT(event_id) ignores its null event key.
13. **Why COUNT(DISTINCT user_id)?** A user may generate many events. Seat use counts unique eligible people, not event volume.
14. **How do you check a join?** Compare final row count, distinct account count and contract count, then reconcile event totals and inspect several source traces.
15. **How would you find duplicate keys?** GROUP BY event_id HAVING COUNT(*)>1. The implementation uses pandas duplicated in stable source order and retains every excluded row in quarantine.
16. **What does EXISTS do in content matching?** It checks whether any qualifying matching-topic view exists without adding one result row per view.

## Data quality

17. **What faults did you inject?** Duplicate event IDs, malformed event dates, orphan users, missing optional request channels and late arrivals. The injection ledger identifies 56 specific anomalies.
18. **Are all anomalies errors?** No. Late arrivals are valid records with warnings; missing optional channels become Unknown. Invalid dates and orphan users are quarantined.
19. **What is quarantine?** A retained exception record with source table, source row and reasons. It makes data loss inspectable instead of silently dropping rows.
20. **How do you handle duplicate IDs?** Keep the first row deterministically and quarantine subsequent rows. Real conflicting duplicates need source-system investigation rather than this simple rule.
21. **What is a referential integrity problem?** An event can cite a user who does not exist or belongs to another account. Both can corrupt engagement metrics and are checked.
22. **How do you test licence eligibility?** Require event_time within the user’s licence interval and a matching account. Active-seat numerators also require eligibility at T.
23. **What is reconciliation?** Raw rows equal accepted plus quarantined rows; joined account rows equal the source account grain; recent events sum back to eligible source events.
24. **What limitation remains in support data?** Closure knowledge is assumed immediate at closed_at. A production feed with delayed closure updates requires available-at timestamps on status history.

## Statistics and evaluation

25. **What is precision at K?** Selected resolved non-renewals divided by selected resolved outcomes. Pending selected accounts are separately disclosed so missing outcomes are not silently counted as negative.
26. **What is recall at K?** Selected resolved non-renewals divided by all resolved non-renewals in the cohort or pooled evaluation split.
27. **What is lift?** Precision divided by the cohort’s non-renewal prevalence. A lift near one adds little discrimination over the base rate.
28. **What did the test show?** The frozen rule found 166 non-renewals among 235 selected resolved accounts, 70.6% precision. Seeded random found 162 among 236, 68.6%. The difference is modest.
29. **Why not use accuracy?** Accuracy ignores the 50-account capacity and can appear strong when one outcome dominates. Precision/recall at capacity match the review decision more closely.
30. **What do the confidence intervals mean?** Wilson intervals describe uncertainty in selected resolved proportions under simplifying independence assumptions. They do not establish causal effects or account for all cohort dependence.
31. **Can overlapping intervals prove no difference?** No. A paired or cohort-aware comparison is needed for that question. The project does not claim statistical superiority.
32. **Why test a stress scenario?** It checks whether conclusions depend on embedded generator relationships. Keeping thresholds unchanged avoids constructing a synthetic example just to favour the rule.

## Timing and leakage

33. **What is temporal leakage?** Using information that would not have been available at the intended decision time, even if it is present in today’s historical export.
34. **Why two timestamps?** event_time says when something happened; available_at says when it became observable. Both must satisfy the cutoff policy.
35. **What happens at exactly T?** An event occurring at T is excluded because the observation interval ends just before T. A prior event arriving exactly at T is included.
36. **What happens at T−30 days?** It belongs to the recent window, not the previous window. Half-open intervals avoid overlaps and gaps.
37. **How is a future ticket closure treated?** As still open at T. The prospective API suppresses the future closure date.
38. **How do you handle unknown outcomes?** Preserve null, exclude from resolved-outcome denominators, and disclose pending counts. Never convert unknown to non-renewal.
39. **Why gaps between splits?** Training outcomes need time to mature and arrive before validation scoring starts. The latest training availability is explicitly compared with the earliest next-split cutoff.
40. **Can you retune after seeing this test?** You can develop a new version, but cannot honestly call the same test untouched again. Use new future cohorts or a newly declared evaluation protocol.

## Qualitative analysis and LLMs

41. **Why start with keywords?** They are reproducible, inspectable and free locally. They establish a baseline before incurring provider cost or adding complex behaviour.
42. **How do you handle negation?** The baseline skips sentences containing not/no/never. This works on included templates but can fail on nuanced mixed-negation language.
43. **What is the taxonomy?** Five named business topics plus Other or unclear. A request can contain several topics.
44. **What is macro-F1?** Compute F1 for each topic and average equally. This prevents a frequent topic from entirely dominating the summary, while support counts expose rare-topic instability.
45. **Why is the keyword score 100%?** It perfectly matches the finite synthetic templates and generator labels in this run. That says little about natural client language and is explicitly not human-validated accuracy.
46. **How do you prevent prompt injection?** Encode request text as data, tell the model not to follow embedded commands, validate a closed schema and evidence spans, and test adversarial examples. These measures reduce risk but do not prove complete security.
47. **What if the LLM returns invalid JSON?** Log the failure, allow one controlled retry, and leave the request failed if still invalid. Missing predictions remain failures in the same-set comparison.
48. **Did you run a live LLM evaluation?** No. The provider adapter is implemented but not called. Credentials, permission for charges and independent annotation remain external dependencies.

## Dashboard and product reasoning

49. **What should the first screen explain?** The decision, cohort and cutoff, attention signals and next action. It also shows the synthetic disclosure and data version.
50. **Why keep outcomes on another page?** A prospective reviewer should see only information available at T. Historical outcomes are useful for validation but can bias the review exercise.
51. **How do filters affect metrics?** Cohort and segments filter overview/engagement/demand consistently. Queue search/status/flag filters narrow selection before top K. Validation clearly uses full cohorts.
52. **Does sorting change who gets selected?** No. Priority determines top K first, then value or name changes display order. This makes the capacity policy explicit.
53. **How do you verify exports?** Compare exported account IDs, order and count with the API selection under the same filters. Export includes all selected pages, not only the visible ten rows.
54. **What does a content gap mean?** An account requested a named topic but recorded no matching-topic view in the observation window despite published content. Investigate discovery; do not assume poor content.
55. **How do you make the app accessible?** Native labelled controls, keyboard focus indicators, readable tables with horizontal scrolling, reduced-motion CSS and responsive navigation. Formal assistive-technology certification is not claimed.
56. **What is a useful empty state?** Explain that no records match the filters and provide reset controls. Do not display zero as if a failed request were a successful empty result.

## Automation and engineering

57. **How can someone reproduce the project?** Install locked dependencies, run make refresh, make test and make demo. Seed and thresholds are in configuration; outputs record a feature checksum and runtime.
58. **Why DuckDB?** It provides local analytical SQL without a separate database service. It handles this demonstration’s data volume and keeps transformations readable.
59. **Why FastAPI?** It provides typed request validation, API routing and a simple local service that also serves the built frontend.
60. **What happens when refresh fails?** It records failure status and preserves the CURRENT pointer to the last complete version. The dashboard marks the output stale.
61. **Why use a lock?** Two refreshes must not compete to publish CURRENT. The local exclusive file lock prevents overlap; it is not a distributed locking system.
62. **How do review states persist?** A separate SQLite file keyed by account_id survives analytical reruns. It records only a local demonstration workflow and sends no messages.
63. **Where do API keys go?** In server-side environment variables or an ignored .env file. Never in Vite/browser variables, commits or exported logs.
64. **What would you change for production?** Authentication, access control, source contracts, bitemporal updates, robust orchestration, observability, backups, retention and privacy controls. Add these only for a real use case.

## Impact and experimentation

65. **How much revenue did the project save?** None is measured. Value under review is fictional exposure. The workbook’s value scenario is explicitly hypothetical.
66. **Why can high-risk accounts be poor outreach targets?** Risk and treatment response differ. Some non-renewals may be unavoidable, while moderately risky accounts may benefit more from help.
67. **How would you test outreach?** Randomize accounts to a defined protocol or business-as-usual, track assignment, and evaluate mature outcomes using intention-to-treat.
68. **Why account-level randomization?** Users within an account share the subscription outcome and may influence each other. User randomization would contaminate treatment and misstate independent sample size.
69. **Which guardrails matter?** Complaint/opt-out rates, staff time, cost per review and data failures. Set limits and response owners before the pilot.
70. **How would you plan sample size?** Use a real baseline rate, minimum meaningful absolute effect, power, significance threshold and expected missingness. Account for cohort structure and practical review capacity.
71. **Why shadow mode first?** It checks whether data and explanations work in practice without changing client treatment. It reveals false flags and workflow burden before an intervention.
72. **What would make you abandon the rule?** Little useful lift, too many misleading reasons, poor data availability, adverse pilot results or excessive cost. A simpler process can be the better choice.

## Ownership, teamwork and motivation

73. **Why Gartner?** “I’m interested in work that connects research and client questions to clear decisions. This role’s described mix of qualitative and quantitative analysis matches [my genuine interest/example]. I want to learn how analysts make evidence useful to client teams.” Verify the current role and add a specific reason you actually believe.
74. **Why analytics?** “I enjoy turning a vague question into a measurable one and checking whether the evidence supports an answer. In ClientLens, separating occurrence from availability showed me why a plausible chart can still be wrong.” Add a true personal example.
75. **Why are you suitable?** “I can demonstrate [skills I have actually practised] through this project: [specific SQL trace/test/explanation]. I’m still developing [honest gap], and I use documented checks and feedback to improve.” Do not claim unearned proficiency.
76. **What differentiates you?** “I try to make the limits of my analysis as visible as the results. This portfolio preserves unknown outcomes, separates exposure from savings, and includes a reproducible pipeline.” Add personal evidence only after doing the work.
77. **What analytical problem did you solve?** “Joining several account-level fact sources can multiply records. The implementation aggregates events, requests and support independently, then verifies one account row and reconciles source totals.” Explain the ten-by-three-by-two example.
78. **What did you do independently?** State exactly what you implemented, reviewed and tested yourself after receiving this AI-assisted build. Use the contribution checklist; do not present generated code as unaided work.
79. **How did you collaborate?** The build is solo/AI-assisted. Before peer review, say no collaboration evidence exists yet. After a real exercise, describe the person’s role, feedback and the change you made, without inventing adoption.
80. **How do you respond to conflicting feedback?** Clarify the decision each reviewer needs, inspect evidence and prototype the smallest change. Record what you accepted or declined and why. Use a real example from the peer log once completed.

## Extra practice

81. **Why not add logistic regression immediately?** The optional model is deferred. The rule has only modest observed lift and the synthetic generator is artificial; a model could add complexity without credible external value.
82. **What is calibration?** Predicted probabilities should match empirical frequencies. The rule has no probabilities, so calibration is not applicable. A future model would need out-of-time reliability plots and Brier/log-loss checks.
83. **What bug did verification uncover?** A SQL alias containing a subquery was unsupported, and pandas treated `.flags` as an internal property rather than the named column. Both were corrected before delivery. Describe the fixes only after inspecting them.
84. **What would you investigate next?** Independently annotate diverse real or separately authored requests, inspect missing-source assumptions, and test whether modest ranking gains persist across future cohorts.
