# Verification record

Verified locally on 2026-10-14. All identities and source data are synthetic.

## Analytical and API checks

22 pytest tests passed. They cover source row reconciliation; join cardinality; active-seat denominators; exact T, T−30, T−60 and T−90 boundaries; late availability; future support closure; temporal split gaps; pending outcomes; zero previous activity; multi-topic/negated/adversarial text; classifier schema and evidence failures; matching filters/exports; exclusion of outcomes from prospective responses; review-state persistence across clients; orphan and unlicensed users; empty/error API cases; failed refresh preserving CURRENT; deterministic ties and small-cohort K; original malformed-value preservation; clean-reference publication dates; and reproducible generator and SQL outputs.

The final reference contains 100,000 publication-valid events. The raw export contains 100,048 event rows. Quality detected all 56 injected anomalies and quarantined 40 invalid rows. Missing optional channels and late arrivals remain with warnings. The final feature SHA-256 is `2fa81081937728d26418e630067923db2a3e545c5bba2b891af640745eeaa976`. A fresh generator produced byte-identical source CSV files and a fresh SQL build produced that same feature checksum.

The final full baseline refresh took 121.686 seconds while a separate stress build and other verification tasks ran concurrently. Recorded dataset size was 57,533,339 bytes before final metadata. This is a local demonstration measurement, not an enterprise performance benchmark.

Frontend TypeScript checking and Vite production build passed. The chart bundle triggers Vite's non-fatal size advisory (about 647 kB minified / 193 kB gzip). Lazy-loading charts would be a reasonable performance improvement for deployment. The test runtime reports a Starlette/httpx deprecation warning; current tests pass.

## Browser verification

Inspected the local app using the in-app browser at laptop (1440×1000) and mobile (390×844) viewports. Verified overview hierarchy, disclosure and cutoff labels; queue navigation and capacity controls; industry filtering; empty search; account evidence; persisted Investigating status; responsive navigation; horizontally scrolling tables; mobile demand chart labels and legend; and the explicit LLM-not-run state. Native labelled controls expose their names in the accessibility tree. Mobile off-canvas navigation is hidden from focus when closed. Supporting small text was darkened after inspection.

A separate local verification server on port 8018 deliberately returned HTTP 503 to test the error state. The browser showed the cause and Try again action, rather than a false zero result. It did not replace the working application's data. No formal screen-reader audit, WCAG certification or device hardware test is claimed.

## Editable artifacts

The workbook was recalculated and rendered. Cohort exposure formulas reconciled to independent pipeline totals. A source-value change of USD 100 changed its cohort reconciliation difference by USD 100; restoring the input restored the check. Changing the hypothetical incremental effect from 2% to 3% changed expected incremental renewals from 1.0 to 1.5. Formula-error inspection found no errors in the final workbook. All four worksheet preview regions were inspected.

The ten-slide presentation uses editable text, actual measured results and clear pending-work labels. All ten slide renders were inspected. Package, geometry, font and artifact-library import validation were performed. Native Microsoft Excel/PowerPoint application execution is not claimed.

## Outstanding external validation

No paid LLM request was sent. Human labels, independent peer feedback, a real-world pilot, authentication/security review and production deployment remain pending. Logistic regression and dark mode are optional features omitted from version one. GitHub Actions configuration is included; its actual run status must be checked after push rather than assumed from local results.
