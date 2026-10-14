# Data dictionary

All identities and values are fictional. UTC timestamps use ISO text in CSV and TIMESTAMP in DuckDB. Each file has a header. Empty CSV cells represent null. Foreign keys listed below must resolve. Monetary values are annual USD, seats are integer counts.

## accounts

Grain: one fictional account. Primary key: `account_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| account_id | text | Account foreign key (primary in accounts) |
| fictional_account_name | text | Fictional display name; never a real customer |
| industry | text | Technology / Manufacturing / Finance / Professional services |
| region | text | APAC / EMEA / Americas |
| company_size | text | Small / Mid-market / Enterprise, based on licensed seats |
| account_start | UTC timestamp | Start of account relationship, before contract start |
## contracts

Grain: one annual contract per account. Primary key: `contract_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| contract_id | text | Contract key; outcomes foreign key |
| account_id | text | Account foreign key (primary in accounts) |
| start_date | UTC timestamp | Annual contract start |
| renewal_date | UTC timestamp | Common first-of-month renewal date per cohort |
| annual_value | integer / numeric | Positive annual subscription exposure in USD |
| licensed_seats | integer / numeric | Positive allocated licence count |
## users

Grain: one licensed user. Primary key: `user_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| user_id | text | User key; events foreign key |
| account_id | text | Account foreign key (primary in accounts) |
| eligible_from | UTC timestamp | Inclusive user licence start |
| eligible_to | UTC timestamp | Exclusive user licence end |
## events

Grain: one interaction. Primary key: `event_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| event_id | text | Unique interaction identifier |
| account_id | text | Account foreign key (primary in accounts) |
| user_id | text | User key; events foreign key |
| event_time | UTC timestamp | Occurrence timestamp |
| available_at | UTC timestamp | Timestamp source record became observable |
| event_type | text | content_view / consultation / event_attendance |
| content_id | text | Content key; required for views, optional otherwise |
## content

Grain: one content item. Primary key: `content_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| content_id | text | Content key; required for views, optional otherwise |
| title | text | Fictional content title |
| topic | text | One named topic from closed taxonomy |
| format | text | Article / Research brief / Webinar |
| publication_date | UTC timestamp | Earliest content availability |
## support

Grain: one support ticket. Primary key: `ticket_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| ticket_id | text | Support key |
| account_id | text | Account foreign key (primary in accounts) |
| opened_at | UTC timestamp | Support occurrence timestamp |
| available_at | UTC timestamp | Timestamp source record became observable |
| closed_at | UTC timestamp | Nullable closure time; future closures remain open at cutoff |
| severity | text | low / medium / severe |
## client_requests

Grain: one written request. Primary key: `request_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| request_id | text | Request key |
| account_id | text | Account foreign key (primary in accounts) |
| request_time | UTC timestamp | Written request occurrence timestamp |
| available_at | UTC timestamp | Timestamp source record became observable |
| request_text | text | Untrusted fictional text, never executable instructions |
| source_channel | text | Email / Portal / Consultation; missing becomes Unknown with warning |
## outcomes

Grain: one contract outcome, possibly unknown. Primary key: `contract_id`.

| Field | Type / unit | Meaning and null handling |
|---|---|---|
| contract_id | text | Contract key; outcomes foreign key |
| renewed | integer / numeric | 1 renewed / 0 non-renewed / null unknown |
| outcome_date | UTC timestamp | Nullable decision date; not a scoring feature |
| outcome_available_at | UTC timestamp | Nullable outcome ingestion date; required for resolved evaluation |

## Relationships

accounts 1:1 contracts; accounts 1:many users/events/support/requests; users 1:many events; content 1:many view events; contracts 1:1 outcomes. Final features 1:1 contracts in version one. request_topics is multi-label (request_id,topic). demand_evidence is request/topic grain, not account grain; aggregate distinct account IDs for demand.

Required nulls quarantine rows. Optional content_id is permitted on non-views, closed_at on open support, and all outcome fields on pending outcomes. Missing optional channel is retained as Unknown. Dates that cannot be parsed are quarantined. Generator-only latent variables are never exported.
