-- ROOM-AURA — add request_status_history to Realtime.
--
-- Bug found while testing Phase 4's request detail panel: its audit
-- timeline only showed whatever existed at the moment the panel first
-- mounted, because request_status_history was never added to the
-- supabase_realtime publication (00000000000011_realtime.sql only added
-- `requests` and `notifications`). Every status-change row the trigger
-- inserts afterward was invisible until the panel was closed and reopened.
alter publication supabase_realtime add table request_status_history;
