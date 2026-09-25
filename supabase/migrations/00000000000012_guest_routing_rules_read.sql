-- ROOM-AURA — let guests read their own hotel's routing_rules.
--
-- Bug found while testing Phase 3's free-text flow: the guest client
-- resolves which department a free-text request routes to (see
-- apps/tourist/src/lib/departmentRouter.ts) by reading routing_rules
-- directly, but 00000000000009_rls_policies.sql only granted staff
-- (admin/manager) read access to that table. With no guest policy at all,
-- every free-text request silently fell through to the hotel's default
-- department instead of matching a keyword.
--
-- routing_rules content (a keyword -> department mapping, e.g. "towel" ->
-- Housekeeping) isn't sensitive the way access_tokens or staff_users are —
-- there's no harm in a guest being able to read it, only in them writing
-- it, which admin/manager-only write policies already prevent.
create policy "guest reads own hotel routing rules"
  on routing_rules for select to authenticated
  using (hotel_id = (select guest_hotel_id()));
