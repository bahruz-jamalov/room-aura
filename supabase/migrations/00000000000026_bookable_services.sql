-- Lets a service (e.g. a spa treatment or a restaurant table) require the
-- guest to pick a date & time, instead of being sent immediately like a
-- housekeeping request. Deliberately no availability/capacity engine —
-- staff confirm or decline manually in the admin, same as every other
-- request's existing accept/reject flow. requested_for lives on requests
-- (not services) since it's a per-booking value, same pattern as
-- guest_note/quantity.

alter table services add column requires_scheduling boolean not null default false;
alter table requests add column requested_for timestamptz;
