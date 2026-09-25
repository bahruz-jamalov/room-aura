-- ROOM-AURA — Enumerated types
-- See docs/ARCHITECTURE.md section 3 for the full data model rationale.

create type hotel_status as enum ('active', 'inactive', 'trial');
create type hotel_plan as enum ('pilot', 'pro', 'enterprise');

-- role x department is the permission model (see ARCHITECTURE.md section 7).
-- Departments themselves are DATA (see `departments` table), not part of this enum.
create type staff_role as enum ('hotel_admin', 'manager', 'staff');
create type staff_status as enum ('active', 'inactive');

create type category_type as enum ('standard', 'menu');

-- One state machine for requests, freetext messages and orders (kind = request_kind).
create type request_kind as enum ('service', 'freetext', 'order');

create type request_status as enum (
  'new',
  'accepted',
  'in_progress',
  'on_the_way',
  'completed',
  'cancelled'
);

create type actor_type as enum ('guest', 'staff', 'system');

create type event_type as enum ('status_change', 'note', 'assignment', 'estimate');

create type payment_method as enum ('charge_to_room', 'pay_at_hotel');

create type menu_item_status as enum ('available', 'sold_out', 'hidden');

create type access_kind as enum ('hotel', 'room', 'access_code');

create type notification_audience as enum ('guest', 'staff');
