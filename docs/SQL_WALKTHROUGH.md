# Reading the SQL, one table at a time

Open `sql/features.sql` beside this guide. Run `make generate`, `make quality`, `make features` to build a scratch database without replacing the app dataset.

1. **cutoffs** joins the one-contract-per-account spine and derives T, cohort and tenure. This sets the intended grain before looking at facts.
2. **eligible_users** keeps users whose inclusive licence start and exclusive end cover T. A user can only contribute once because user_id is unique after quality checks.
3. **observed_events** joins to matching account/user and published content. It requires event_time<T, available_at≤T and event_time≥T−90. Inner user joins exclude invalid users; invalid source rows are already retained in quarantine.
4. **event_features** LEFT JOINs accounts to observed events. Conditional COUNT aggregates produce recent, previous, consultation and event counts in a single scan. DISTINCT user_id protects active-seat counts. `COUNT(event_id)` produces zero for unmatched accounts, unlike `COUNT(*)`.
5. **support_features** counts severe tickets known at T, with no closure before T. Future closures remain open. It aggregates before the final join.
6. **observed_requests** applies the same occurrence and availability policy to the 90-day request window. **request_features** then counts at account grain.
7. **features** joins only one-row-per-account aggregates. Eligible-seat counts come from another aggregate. `NULLIF` prevents division by zero; explicit categories distinguish new activity from persistent inactivity.
8. **demand_evidence** joins request labels and uses EXISTS for matching-topic views and available content. EXISTS avoids multiplying each request by every matching view. This table is request/topic grain; demand must use DISTINCT account_id.

Try these queries in Python:

```python
import duckdb
con = duckdb.connect('data/manual/derived/analytics.duckdb', read_only=True)
print(con.sql('SELECT cohort, count(*) accounts, sum(recent) recent FROM features GROUP BY cohort ORDER BY cohort').df())
print(con.sql("SELECT account_id, recent, previous, activity_change, activity_category FROM features WHERE previous=0 LIMIT 10").df())
```

A `WHERE` condition on an optional right-hand table can accidentally turn a LEFT JOIN into an inner join. In this SQL, conditional fact filters live inside the joined observation table, the ON clause, or FILTER aggregates so the account spine survives. Add boundary tests whenever editing intervals.
