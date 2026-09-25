-- ROOM-AURA — add feedback to the realtime publication.
--
-- Phase 7's dashboard KPIs (Guest Rating / Effort Score) and the /feedback
-- and /analytics screens subscribe to postgres_changes on `feedback` so a
-- guest submitting a rating updates the admin live, matching the pattern
-- established for requests/orders/request_status_history. Same lesson
-- learned twice already (00000000000011, 00000000000013): a table has to
-- be explicitly added here, or the subscription silently receives nothing.
alter publication supabase_realtime add table feedback;
