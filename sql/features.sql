CREATE OR REPLACE TABLE cutoffs AS SELECT c.*,a.* EXCLUDE(account_id),renewal_date-INTERVAL 60 DAY cutoff,strftime(renewal_date,'%Y-%m') cohort,date_diff('day',account_start,renewal_date-INTERVAL 60 DAY) tenure_days FROM contracts c JOIN accounts a USING(account_id);
CREATE OR REPLACE TABLE eligible_users AS SELECT c.account_id,u.user_id FROM cutoffs c JOIN users u USING(account_id) WHERE eligible_from<=cutoff AND eligible_to>cutoff;
CREATE OR REPLACE TABLE observed_events AS
SELECT e.*,c.cutoff FROM events e JOIN cutoffs c USING(account_id) JOIN users u ON e.user_id=u.user_id AND e.account_id=u.account_id LEFT JOIN content n USING(content_id)
WHERE event_time<cutoff AND available_at<=cutoff AND event_time>=cutoff-INTERVAL 90 DAY AND event_time>=eligible_from AND event_time<eligible_to AND (event_type<>'content_view' OR publication_date<=event_time);
-- Aggregate each fact BEFORE joining. Otherwise events × tickets multiply counts.
CREATE OR REPLACE TABLE event_features AS SELECT c.account_id,
 count(e.event_id) FILTER(WHERE event_time>=c.cutoff-INTERVAL 30 DAY) recent,
 count(e.event_id) FILTER(WHERE event_time>=c.cutoff-INTERVAL 60 DAY AND event_time<c.cutoff-INTERVAL 30 DAY) previous,
 count(DISTINCT e.user_id) FILTER(WHERE event_time>=c.cutoff-INTERVAL 30 DAY AND eu.user_id IS NOT NULL) active_users,
 count(e.event_id) FILTER(WHERE event_type='consultation') consultations,
 count(e.event_id) FILTER(WHERE event_type='event_attendance') attendance,
 max(event_time) last_activity,max(available_at) latest_available
FROM cutoffs c LEFT JOIN observed_events e USING(account_id) LEFT JOIN eligible_users eu ON eu.account_id=e.account_id AND eu.user_id=e.user_id GROUP BY c.account_id;
CREATE OR REPLACE TABLE support_features AS SELECT c.account_id,count(ticket_id) severe_open FROM cutoffs c LEFT JOIN support s ON c.account_id=s.account_id AND opened_at<cutoff AND available_at<=cutoff AND (closed_at IS NULL OR closed_at>=cutoff) AND severity='severe' GROUP BY c.account_id;
CREATE OR REPLACE TABLE observed_requests AS SELECT r.*,cutoff FROM client_requests r JOIN cutoffs c USING(account_id) WHERE request_time>=cutoff-INTERVAL 90 DAY AND request_time<cutoff AND available_at<=cutoff;
CREATE OR REPLACE TABLE request_features AS SELECT c.account_id,count(request_id) request_count FROM cutoffs c LEFT JOIN observed_requests r USING(account_id) GROUP BY c.account_id;
CREATE OR REPLACE TABLE features AS SELECT c.*,e.* EXCLUDE(account_id),s.severe_open,r.request_count,
 coalesce(u.eligible_seats,0) eligible_seats,
 active_users::DOUBLE/nullif(u.eligible_seats,0) active_seat_rate,
 CASE WHEN previous=0 THEN NULL ELSE (recent-previous)::DOUBLE/previous END activity_change,
 CASE WHEN previous=0 AND recent=0 THEN 'Persistent inactivity' WHEN previous=0 THEN 'New activity' ELSE 'Comparable' END activity_category,
 CASE WHEN last_activity IS NULL THEN 999 ELSE date_diff('day',last_activity,cutoff) END days_since_activity
FROM cutoffs c JOIN event_features e USING(account_id) JOIN support_features s USING(account_id) JOIN request_features r USING(account_id) LEFT JOIN (SELECT account_id,count(*) eligible_seats FROM eligible_users GROUP BY account_id) u USING(account_id);
CREATE OR REPLACE TABLE demand_evidence AS SELECT DISTINCT r.account_id,r.request_id,r.request_text,r.request_time,r.available_at,t.topic,
 EXISTS(SELECT 1 FROM observed_events e JOIN content n USING(content_id) WHERE e.account_id=r.account_id AND n.topic=t.topic AND event_type='content_view') matching_view,
 EXISTS(SELECT 1 FROM content n WHERE n.topic=t.topic AND publication_date<r.cutoff) content_available
FROM observed_requests r JOIN request_topics t USING(request_id);
