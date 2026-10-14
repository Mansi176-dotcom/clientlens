# Measured findings

Baseline seed 42, data version 2fa81081. Generated 2,000 accounts, 100,048 raw event rows and 1,800 requests. The clean reference contains 100,000 events. Refresh took 121.686 seconds and generated 54.9 MiB before metadata files.

Test cohorts August–December 2025 contain 415 accounts, 394 resolved outcomes. Rule precision: 70.6% (166/235), recall 63.4%, lift 1.062. Random precision: 68.6% (162/236), recall 61.8%, lift 1.032. Pending selections: 15 rule, 14 random. These are modest descriptive differences, not causal evidence or a proven win.

December 2025: 83 eligible accounts, 59 flagged; 655 / 4186 active seats (15.6%); 77 accounts consulted; 11 open severe tickets; selected exposure USD 3,465,257. Historical renewal: 23/79 resolved (29.1%), shown only in validation.

Quality: 56/56 injected anomalies detected, 40 rows quarantined. Keyword macro-F1 100.0% on 1058 generator-labelled evaluation examples, coverage 74.3%, abstention 25.7%. Perfect matching of these simple templates is not credible evidence of real-language accuracy. Human annotations and LLM runs: none completed.
