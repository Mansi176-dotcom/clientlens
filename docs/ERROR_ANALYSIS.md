# Error analysis and remaining uncertainty

## Review ranking

Held-out rule precision (70.6%) is only modestly above one seeded random draw (68.6%). The rule selects 250 accounts across five cohorts, but 15 have unknown outcomes. Of the 235 resolved selections, 69 renewed. Calling those all “mistakes” would be too strong: an account can have a legitimate support issue and still renew. There are 96 resolved non-renewals outside the rule's selected set (262 total minus 166 selected). No outreach response is measured.

Large accounts can have low seat-use percentages despite substantial absolute engagement. Inspect pooled and account-level denominators before treating this as poor engagement. The top-K capacity forces selection even when an account has no flags. A zero-flag account is explicitly labelled routine review.

The stress scenario changes latent outcome relationships while preserving the rule. Compare `reports/stress.json` with the baseline before claiming stability. Random variation and simplistic behaviour generation limit both scenarios. Names repeat systematic prefixes within cohorts because identifiers are generated deterministically; identities remain fictional and the naming pattern is not a feature.

## Classification

There are zero keyword-versus-generator errors in the included 1,058-example evaluation. This is evidence that the test language is too simple, not that the classifier is production-ready. Named synonyms overlap the generator vocabulary. Negation templates are easy sentence splits; authentic language is more varied. Potential failure examples for future independent annotation include “not only AI adoption but also data governance” (both may be wrongly suppressed), “we already solved cloud costs” (could be falsely treated as demand), and implicit topic references without keywords.

Do not silently add these examples to the measured test or tune the generator to create a desired score. Create a separately versioned evaluation set with human labels. Report topic support, precision, recall, F1, coverage, abstentions and schema validity together. Review semantic mistakes even when structured JSON is valid.

## Engineering fixes during implementation

DuckDB could not reference an alias whose expression contained a scalar subquery; eligible-seat counts now come from a separate aggregate. pandas `.flags` resolved to an internal object, so the score column now uses bracket indexing. An all-null test content_id inferred as integer; explicit string typing protects identifier schema. Quarantine now retains the original malformed date text, rather than only a parsed null.

The browser review led to an explicit queue loading state so changing filters does not temporarily present old rows as current. Tests exercise source timing, pending outcomes, zero previous activity, invalid users, deterministic ties, export matching and persisted statuses.

## Publication-date correction

During final source inspection, the initial generator had allowed some views of content editions not yet published. Quality checks correctly quarantined those rows. The generator now uses the earliest published edition of the same topic whenever a sampled edition is not yet available, without changing random draws or the outcome mechanism. Baseline and stress reports were rebuilt. Final quarantine count is 40 injected invalid rows; the clean reference passes a dedicated publication-date test. No thresholds or outcome relationships were retuned, and held-out rule precision remains 70.6%.
