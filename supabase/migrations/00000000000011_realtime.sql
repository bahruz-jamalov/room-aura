-- ROOM-AURA — enable Realtime on the tables the guest tracker and staff
-- queue both depend on. Supabase Realtime only broadcasts postgres_changes
-- for tables explicitly added to this publication, and still enforces RLS
-- per-subscriber — a guest's subscription only ever receives changes to
-- rows they could SELECT anyway (docs/ARCHITECTURE.md section 8).

alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table notifications;
