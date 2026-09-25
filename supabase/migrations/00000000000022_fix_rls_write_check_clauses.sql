-- ROOM-AURA — fix a systemic RLS bug: every "admin/manager writes own
-- hotel X" (and "hotel admin manages X") policy in 00000000000009 used
-- `for all`, with a USING clause that correctly required the right role,
-- but a WITH CHECK clause that only verified hotel_id — never the role.
--
-- Found by Phase 9's automated role-permission test (scripts/test-roles.ts):
-- a plain Housekeeping staff account could INSERT a new service_categories
-- row and a new departments row, which should be admin/manager only.
--
-- Why this only broke INSERT, not UPDATE/DELETE: for UPDATE/DELETE,
-- Postgres evaluates USING first to decide whether the existing row is even
-- visible/selectable — a plain staff member can't select someone else's
-- row to update in the first place, so the weak WITH CHECK never mattered
-- there. INSERT has no existing row, so WITH CHECK is the ONLY gate —
-- and it was missing the role check on every one of these tables.
--
-- Two of these are more than a catalogue-editing nuisance:
--   - access_tokens: any staff member (not just hotel_admin) could mint a
--     brand new hotel-wide or per-room QR/access code — i.e. grant guest
--     room access — despite ARCHITECTURE.md section 7 being explicit that
--     QR/access tokens are hotel_admin only, not even manager.
--   - staff_users: any staff member could INSERT a new roster row for an
--     arbitrary auth.users id within their own hotel with role =
--     'hotel_admin', a privilege-escalation path.
--
-- Fix: ALTER POLICY to add the same role check already present in each
-- policy's own USING clause to its WITH CHECK clause too. Policy names and
-- USING clauses are unchanged.

alter policy "hotel admin writes own hotel settings" on hotel_settings
  with check (hotel_id = (select auth_hotel_id()) and (select is_hotel_admin()));

alter policy "admin or manager writes own hotel departments" on departments
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel floors" on floors
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel rooms" on rooms
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "hotel admin manages own hotel roster" on staff_users
  with check (hotel_id = (select auth_hotel_id()) and (select is_hotel_admin()));

alter policy "admin or manager writes own hotel categories" on service_categories
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel category translations" on service_category_translations
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel services" on services
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel service translations" on service_translations
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel menu categories" on menu_categories
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel menu category translations" on menu_category_translations
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel menu items" on menu_items
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "admin or manager writes own hotel menu item translations" on menu_item_translations
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

alter policy "hotel admin manages own hotel access tokens" on access_tokens
  with check (hotel_id = (select auth_hotel_id()) and (select is_hotel_admin()));

alter policy "admin or manager writes own hotel routing rules" on routing_rules
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));
