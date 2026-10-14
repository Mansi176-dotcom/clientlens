# Updating the editable handoff files

The delivered XLSX and PPTX are actual editable Office files, generated with Codex's bundled artifact library. They are snapshots of the verified run. Running the application does not require that authoring library.

To refresh analytical evidence, run `make refresh`, `make stress`, then `.venv/bin/python -m analytics.report`. This regenerates findings.json, FINDINGS.md, cohort_totals.csv, account traces and artifact-input.json.

For Excel, use account rows in artifact-input.json as the Accounts inputs (or export those ten columns from historical_features.csv and compute selected flags using the documented rule). Keep typed values. The current 2,000-account ranges are rows 6:2005. Cohorts uses COUNTIF, SUMIF, SUMIFS and guarded ratios. If account count changes, extend every bounded source range consistently. Column J contains the independently calculated pipeline exposure control; update it from cohort_totals.csv, not by linking to column I. Column K should return zero. Scenario assumptions in amber drive formulas and are never observed impact.

For PowerPoint, edit the relevant text using fresh calculated results and keep pending/unverified components labelled. Do not copy a previous result into a new data-version claim. The deck’s narrative and speaking guidance are also in docs/DEMO_SCRIPT.md.

The original build was rendered and checked with the artifact runtime. Native Excel/PowerPoint application behaviour has not been separately tested. If using another spreadsheet engine, recalculate and check key formulas before presenting.
