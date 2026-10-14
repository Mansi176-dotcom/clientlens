# Introductions and demonstration

Use these scripts only after you understand and can reproduce the project. Say “I built with AI assistance” rather than implying unaided implementation. Personal experience is intentionally left blank.

## 30 seconds

“ClientLens is an independent synthetic-data portfolio project for a fictional research subscription business. It helps prioritize up to 50 account reviews 60 days before renewal. It combines usage, written requests and support evidence using Python and SQL, then presents explainable reasons in a local dashboard. I built and studied it with AI assistance. Its main lesson is that reliable timing and clear denominators matter more than an impressive-looking score.”

## 60 seconds

“ClientLens asks which subscription accounts deserve a closer look before renewal. The data is fictional: 2,000 accounts across 24 monthly cohorts, with 100,000 generated engagement events plus controlled raw-export faults. The pipeline quarantines invalid records and applies both occurrence and availability cutoffs before creating one account row. A simple three-flag rule prioritizes a monthly capacity of 50. On future test cohorts its precision was 70.6%, versus 68.6% for seeded random selection, so I describe the result as modest. The dashboard shows request evidence and possible content discovery gaps while keeping future outcomes off review screens. The optional LLM integration has not been run, and independent annotation is still required. My personal contribution so far is [fill in honestly].”

## Three-minute live demonstration

**0:00–0:30:** Open Portfolio overview at December 2025. Point out synthetic disclosure, cutoff 2025-10-02, 83 eligible accounts and 59 with flags. Explain that the displayed USD amount is exposure, not savings.

**0:30–1:10:** Open review queue. Change capacity to 10, filter by Technology, and open Atlas Labs 0312. Explain its three signals, timestamp rules and open-at-cutoff support. Change the local status to Investigating, refresh and verify it persists. State that no outreach is sent.

**1:10–1:40:** Reset filters. Open Demand & content. Select a topic and read a supporting request. Distinguish no recorded matching view from missing or bad content. Explain coverage and the unconfigured LLM state.

**1:40–2:20:** Open Validation & quality. Show the exact temporal splits, gaps, unknown outcomes, rule versus random precision, and 56/56 injected anomalies detected. The rule’s modest difference is the honest finding.

**2:20–2:45:** Show the reconciliation workbook. Trace a cohort formula to account-level inputs and demonstrate that the hypothetical value scenario is driven by editable assumptions.

**2:45–3:00:** Close with limitations: synthetic associations, simplistic text, pending human labels, no deployed client impact. Propose shadow mode and a controlled account-level pilot.

## Longer explanation

Begin with the capacity decision, not the technology list. Explain the eight source grains and why a direct fact-to-fact join multiplies counts. Use one account trace to show recent and previous windows, then explain why late data must be excluded even when an event occurred earlier. Describe null outcomes and why train/validation/test require maturity gaps. Show the simple flags and deterministic ranking, then compare with random at the same capacity. Discuss the keyword baseline and why perfect generator-label scores are insufficient. End with the distinction between predicting an outcome and changing it through a controlled intervention.

If an interviewer asks for work you have not done, say so directly. Independent peer feedback, manual labels, live provider evaluation and real-world deployment are not completed achievements.
