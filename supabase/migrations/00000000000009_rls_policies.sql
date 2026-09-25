-- ROOM-AURA — Row Level Security policies.
--
-- Every table has RLS already enabled (from its own creation migration) with
-- zero policies, i.e. default-deny. This migration is purely additive.
--
-- Conventions:
--   * All policies target `to authenticated` — Supabase anonymous-auth guests
--     and password-auth staff both arrive as Postgres role `authenticated`;
--     the helper functions (guest_*() vs auth_*()) are what tell them apart.
--   * Multiple permissive policies on the same table/command are OR'd by
--     Postgres, so one policy per persona (guest / staff / platform) stays
--     readable instead of one giant boolean expression.
--   * Calls are wrapped as `(select fn())` so Postgres evaluates each helper
--     once per statement rather than once per row.
--   * Platform admins do NOT get raw SELECT on guest-content tables
--     (requests, request_status_history, orders, order_items, feedback) —
--     per docs/ARCHITECTURE.md, the platform sees aggregates only, exposed
--     later via SECURITY DEFINER RPCs. This is a deliberate privacy boundary,
--     not an oversight.

-- ============================================================ hotels
create policy "guest reads own hotel"
  on hotels for select to authenticated
  using (id = (select guest_hotel_id()));

create policy "staff reads own hotel"
  on hotels for select to authenticated
  using (id = (select auth_hotel_id()));

create policy "platform reads all hotels"
  on hotels for select to authenticated
  using ((select is_platform_admin()));

create policy "hotel admin updates own hotel"
  on hotels for update to authenticated
  using (id = (select auth_hotel_id()) and (select is_hotel_admin()))
  with check (id = (select auth_hotel_id()));

create policy "platform manages all hotels"
  on hotels for all to authenticated
  using ((select is_platform_admin()))
  with check ((select is_platform_admin()));

-- ===================================================== hotel_settings
create policy "guest reads own hotel settings"
  on hotel_settings for select to authenticated
  using (hotel_id = (select guest_hotel_id()));

create policy "staff reads own hotel settings"
  on hotel_settings for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "hotel admin writes own hotel settings"
  on hotel_settings for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_hotel_admin()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "platform manages all hotel settings"
  on hotel_settings for all to authenticated
  using ((select is_platform_admin()))
  with check ((select is_platform_admin()));

-- ======================================================== departments
create policy "guest reads active departments of own hotel"
  on departments for select to authenticated
  using (hotel_id = (select guest_hotel_id()) and is_active);

create policy "staff reads own hotel departments"
  on departments for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel departments"
  on departments for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "platform reads all departments"
  on departments for select to authenticated
  using ((select is_platform_admin()));

-- ============================================================== floors
create policy "guest reads own hotel floors"
  on floors for select to authenticated
  using (hotel_id = (select guest_hotel_id()));

create policy "staff reads own hotel floors"
  on floors for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel floors"
  on floors for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

-- =============================================================== rooms
create policy "guest reads own room only"
  on rooms for select to authenticated
  using (id = (select guest_room_id()));

create policy "staff reads own hotel rooms"
  on rooms for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel rooms"
  on rooms for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "platform reads all rooms"
  on rooms for select to authenticated
  using ((select is_platform_admin()));

-- ======================================================== staff_users
create policy "staff reads own hotel roster"
  on staff_users for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "staff reads own row"
  on staff_users for select to authenticated
  using (id = auth.uid());

create policy "hotel admin manages own hotel roster"
  on staff_users for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_hotel_admin()))
  with check (hotel_id = (select auth_hotel_id()));

-- Bootstrapping a hotel's first admin account has no existing staff_users
-- row to authorise from, so it can only be done by ROOM-AURA itself.
create policy "platform manages all staff"
  on staff_users for all to authenticated
  using ((select is_platform_admin()))
  with check ((select is_platform_admin()));

-- ================================================ catalogue: categories
create policy "guest reads active categories of own hotel"
  on service_categories for select to authenticated
  using (hotel_id = (select guest_hotel_id()) and is_active);

create policy "staff reads own hotel categories"
  on service_categories for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel categories"
  on service_categories for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "guest reads category translations of own hotel"
  on service_category_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()));

create policy "staff reads own hotel category translations"
  on service_category_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel category translations"
  on service_category_translations for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

-- ================================================== catalogue: services
create policy "guest reads active services of own hotel"
  on services for select to authenticated
  using (hotel_id = (select guest_hotel_id()) and is_active);

create policy "staff reads own hotel services"
  on services for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel services"
  on services for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "guest reads service translations of own hotel"
  on service_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()));

create policy "staff reads own hotel service translations"
  on service_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel service translations"
  on service_translations for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

-- =========================================== catalogue: menu categories
create policy "guest reads active menu categories of own hotel"
  on menu_categories for select to authenticated
  using (hotel_id = (select guest_hotel_id()) and is_active);

create policy "staff reads own hotel menu categories"
  on menu_categories for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel menu categories"
  on menu_categories for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "guest reads menu category translations of own hotel"
  on menu_category_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()));

create policy "staff reads own hotel menu category translations"
  on menu_category_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel menu category translations"
  on menu_category_translations for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

-- ================================================== catalogue: menu items
create policy "guest reads visible menu items of own hotel"
  on menu_items for select to authenticated
  using (hotel_id = (select guest_hotel_id()) and status <> 'hidden'::menu_item_status);

create policy "staff reads own hotel menu items"
  on menu_items for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel menu items"
  on menu_items for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "guest reads menu item translations of own hotel"
  on menu_item_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()));

create policy "staff reads own hotel menu item translations"
  on menu_item_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager writes own hotel menu item translations"
  on menu_item_translations for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));

-- ======================================================== access_tokens
-- Guests never get a policy here at all: default-deny, no exceptions.
create policy "hotel admin manages own hotel access tokens"
  on access_tokens for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_hotel_admin()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "platform reads all access tokens"
  on access_tokens for select to authenticated
  using ((select is_platform_admin()));

-- ======================================================== guest_sessions
-- Guests never INSERT here directly — a session is created by the
-- redeem-access edge function under the service role. Guests may only read
-- and lightly update (e.g. locale, last_seen_at) their own, still-active row.
create policy "guest reads own session"
  on guest_sessions for select to authenticated
  using (id = (select guest_session_id()));

create policy "guest updates own session"
  on guest_sessions for update to authenticated
  using (id = (select guest_session_id()))
  with check (id = (select guest_session_id()));

create policy "staff reads own hotel guest sessions"
  on guest_sessions for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "platform reads all guest sessions"
  on guest_sessions for select to authenticated
  using ((select is_platform_admin()));

-- ============================================================== requests
-- Deliberately no platform_admin policy: platform sees aggregates only,
-- via RPCs added alongside analytics (docs/ARCHITECTURE.md section 4/10).
create policy "guest creates own requests"
  on requests for insert to authenticated
  with check (
    hotel_id = (select guest_hotel_id())
    and room_id = (select guest_room_id())
    and guest_session_id = (select guest_session_id())
  );

create policy "guest reads own requests"
  on requests for select to authenticated
  using (guest_session_id = (select guest_session_id()));

-- Guests may only cancel a request that hasn't been picked up yet. Every
-- other transition is staff-only and re-checked by the state machine
-- trigger regardless of who issues the UPDATE.
create policy "guest cancels own new requests"
  on requests for update to authenticated
  using (guest_session_id = (select guest_session_id()) and status = 'new'::request_status)
  with check (guest_session_id = (select guest_session_id()) and status = 'cancelled'::request_status);

create policy "staff reads own hotel or department requests"
  on requests for select to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and ((select is_admin_or_manager()) or department_id = (select auth_department_id()))
  );

create policy "staff updates own hotel or department requests"
  on requests for update to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and ((select is_admin_or_manager()) or department_id = (select auth_department_id()))
  )
  with check (hotel_id = (select auth_hotel_id()));

-- ============================================== request_status_history
-- Status-change / estimate rows are written only by the trigger on
-- `requests` (see 00000000000010_triggers.sql), never by direct client
-- insert. Staff may add notes and record assignments directly.
create policy "guest reads own request history"
  on request_status_history for select to authenticated
  using (
    exists (
      select 1 from requests r
      where r.id = request_status_history.request_id
        and r.guest_session_id = (select guest_session_id())
    )
  );

create policy "staff reads own hotel or department request history"
  on request_status_history for select to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and exists (
      select 1 from requests r
      where r.id = request_status_history.request_id
        and ((select is_admin_or_manager()) or r.department_id = (select auth_department_id()))
    )
  );

create policy "staff adds notes and assignments to in-scope requests"
  on request_status_history for insert to authenticated
  with check (
    event_type in ('note'::event_type, 'assignment'::event_type)
    and actor_type = 'staff'::actor_type
    and actor_staff_id = auth.uid()
    and hotel_id = (select auth_hotel_id())
    and exists (
      select 1 from requests r
      where r.id = request_status_history.request_id
        and ((select is_admin_or_manager()) or r.department_id = (select auth_department_id()))
    )
  );

-- ================================================================ orders
create policy "guest creates own orders"
  on orders for insert to authenticated
  with check (
    hotel_id = (select guest_hotel_id())
    and exists (
      select 1 from requests r
      where r.id = orders.id and r.guest_session_id = (select guest_session_id())
    )
  );

create policy "guest reads own orders"
  on orders for select to authenticated
  using (
    exists (
      select 1 from requests r
      where r.id = orders.id and r.guest_session_id = (select guest_session_id())
    )
  );

create policy "staff reads own hotel or department orders"
  on orders for select to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and exists (
      select 1 from requests r
      where r.id = orders.id
        and ((select is_admin_or_manager()) or r.department_id = (select auth_department_id()))
    )
  );

-- ============================================================ order_items
create policy "guest creates own order items"
  on order_items for insert to authenticated
  with check (
    hotel_id = (select guest_hotel_id())
    and exists (
      select 1 from orders o
      join requests r on r.id = o.id
      where o.id = order_items.order_id and r.guest_session_id = (select guest_session_id())
    )
  );

create policy "guest reads own order items"
  on order_items for select to authenticated
  using (
    exists (
      select 1 from orders o
      join requests r on r.id = o.id
      where o.id = order_items.order_id and r.guest_session_id = (select guest_session_id())
    )
  );

create policy "staff reads own hotel or department order items"
  on order_items for select to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and exists (
      select 1 from orders o
      join requests r on r.id = o.id
      where o.id = order_items.order_id
        and ((select is_admin_or_manager()) or r.department_id = (select auth_department_id()))
    )
  );

-- ============================================================== feedback
create policy "guest creates feedback for own completed request"
  on feedback for insert to authenticated
  with check (
    guest_session_id = (select guest_session_id())
    and exists (
      select 1 from requests r
      where r.id = feedback.request_id
        and r.guest_session_id = (select guest_session_id())
        and r.status = 'completed'::request_status
    )
  );

create policy "guest reads own feedback"
  on feedback for select to authenticated
  using (guest_session_id = (select guest_session_id()));

-- Feedback is analytics-facing; per the roles matrix, plain Staff does not
-- get analytics/feedback access — only admin and manager do.
create policy "admin or manager reads own hotel feedback"
  on feedback for select to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

-- ========================================================= notifications
create policy "guest reads own notifications"
  on notifications for select to authenticated
  using (guest_session_id = (select guest_session_id()));

create policy "guest marks own notifications read"
  on notifications for update to authenticated
  using (guest_session_id = (select guest_session_id()))
  with check (guest_session_id = (select guest_session_id()));

create policy "staff reads notifications addressed to them"
  on notifications for select to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and (
      staff_user_id = auth.uid()
      or department_id = (select auth_department_id())
      or (select is_admin_or_manager())
    )
  );

create policy "staff marks own notifications read"
  on notifications for update to authenticated
  using (
    hotel_id = (select auth_hotel_id())
    and (
      staff_user_id = auth.uid()
      or department_id = (select auth_department_id())
      or (select is_admin_or_manager())
    )
  )
  with check (hotel_id = (select auth_hotel_id()));

-- ========================================================= routing_rules
create policy "admin or manager reads own hotel routing rules"
  on routing_rules for select to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));

create policy "admin or manager writes own hotel routing rules"
  on routing_rules for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()));
