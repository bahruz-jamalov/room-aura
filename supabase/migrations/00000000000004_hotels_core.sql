-- ROOM-AURA — Tenant core: hotels, departments, floors, rooms, staff
-- RLS is enabled immediately on every table (default-deny with zero policies).
-- Actual policies are added in 00000000000009_rls_policies.sql, once every
-- helper function they depend on exists.

create table hotels (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  city              text not null,
  country           text not null,
  timezone          text not null default 'UTC',
  default_locale    text not null references languages (code),
  supported_locales text[] not null default array['en'],
  currency          char(3) not null default 'USD',
  logo_url          text,
  status            hotel_status not null default 'trial',
  plan              hotel_plan not null default 'pilot',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table hotels enable row level security;

create table hotel_settings (
  hotel_id                 uuid primary key references hotels (id) on delete cascade,
  about                    text,
  address                  text,
  contact_phone            text,
  checkin_time             time,
  checkout_time            time,
  amenities                jsonb not null default '[]'::jsonb,
  guest_session_ttl_hours  integer not null default 72,
  freetext_department_id   uuid, -- FK added after departments exists
  brand_primary            text,
  brand_accent             text,
  updated_at               timestamptz not null default now()
);

alter table hotel_settings enable row level security;

create table departments (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references hotels (id) on delete cascade,
  code        text not null,
  name        text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (hotel_id, code)
);

alter table departments enable row level security;
create index departments_hotel_id_idx on departments (hotel_id);

alter table hotel_settings
  add constraint hotel_settings_freetext_department_fk
  foreign key (freetext_department_id) references departments (id) on delete set null;

create table floors (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references hotels (id) on delete cascade,
  number      integer not null,
  label       text,
  sort_order  integer not null default 0,
  unique (hotel_id, number)
);

alter table floors enable row level security;
create index floors_hotel_id_idx on floors (hotel_id);

create table rooms (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references hotels (id) on delete cascade,
  floor_id    uuid references floors (id) on delete set null,
  number      text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (hotel_id, number)
);

alter table rooms enable row level security;
create index rooms_hotel_id_idx on rooms (hotel_id);

-- Staff identity: 1:1 with auth.users. role x department is the whole
-- permission model — see docs/ARCHITECTURE.md section 7.
create table staff_users (
  id             uuid primary key references auth.users (id) on delete cascade,
  hotel_id       uuid not null references hotels (id) on delete cascade,
  department_id  uuid references departments (id) on delete set null,
  role           staff_role not null default 'staff',
  full_name      text not null,
  email          text not null,
  status         staff_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Only 'staff' is scoped to a single department; admin/manager see the whole hotel.
  constraint staff_department_required_for_staff_role
    check (role in ('hotel_admin', 'manager') or department_id is not null)
);

alter table staff_users enable row level security;
create index staff_users_hotel_id_idx on staff_users (hotel_id);
create index staff_users_department_id_idx on staff_users (department_id);
