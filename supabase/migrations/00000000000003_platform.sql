-- ROOM-AURA — Platform-level tables (not owned by any single hotel)

-- ROOM-AURA company staff, distinct from hotel staff. Grants access to /platform.
create table platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  created_at  timestamptz not null default now()
);

comment on table platform_admins is
  'ROOM-AURA company staff. Not a hotel role — grants access to the /platform super admin area only.';

-- The global language catalogue. Adding a 10th language is one row here plus
-- one i18n JSON file — no schema change, no code change.
create table languages (
  code          text primary key,               -- ISO 639-1, e.g. 'en', 'az', 'ar'
  name_en       text not null,                   -- English name, for staff-facing UI
  name_native   text not null,                   -- name in its own language
  is_rtl        boolean not null default false,
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

comment on table languages is
  'Globally readable. The only table with no hotel_id and no RLS restriction on reads.';

insert into languages (code, name_en, name_native, is_rtl, sort_order) values
  ('en', 'English',    'English',   false, 1),
  ('az', 'Azerbaijani', 'Azərbaycanca', false, 2),
  ('tr', 'Turkish',    'Türkçe',    false, 3),
  ('ru', 'Russian',    'Русский',   false, 4),
  ('ar', 'Arabic',     'العربية',    true,  5),
  ('zh', 'Chinese',    '中文',       false, 6),
  ('fr', 'French',     'Français',  false, 7),
  ('de', 'German',     'Deutsch',   false, 8),
  ('es', 'Spanish',    'Español',   false, 9);

alter table languages enable row level security;

create policy "languages are readable by anyone"
  on languages for select
  to authenticated, anon
  using (true);
