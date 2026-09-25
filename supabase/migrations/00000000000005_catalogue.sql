-- ROOM-AURA — Guest-facing catalogue: service categories, services, menu.
-- No name_en / name_ru columns anywhere: every display string lives in a
-- *_translations table keyed by locale, so a new language is data, not code.
-- Read-time resolution order: requested locale -> hotel default_locale -> 'en'.

create table service_categories (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references hotels (id) on delete cascade,
  category_type  category_type not null default 'standard',
  icon           text,
  image_url      text,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table service_categories enable row level security;
create index service_categories_hotel_id_idx on service_categories (hotel_id);

create table service_category_translations (
  category_id  uuid not null references service_categories (id) on delete cascade,
  hotel_id     uuid not null references hotels (id) on delete cascade, -- denormalised for a single-predicate RLS policy
  locale       text not null references languages (code),
  name         text not null,
  description  text,
  primary key (category_id, locale)
);

alter table service_category_translations enable row level security;
create index service_category_translations_hotel_id_idx on service_category_translations (hotel_id);

create table services (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references hotels (id) on delete cascade,
  category_id       uuid not null references service_categories (id) on delete cascade,
  department_id     uuid not null references departments (id) on delete restrict,
  image_url         text,
  is_free           boolean not null default true,
  price_minor       integer not null default 0,
  currency          char(3) not null default 'USD',
  expected_minutes  integer,
  opening_hours     jsonb,
  allows_quantity   boolean not null default false,
  max_quantity      integer not null default 1,
  allows_note       boolean not null default true,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint services_price_non_negative check (price_minor >= 0),
  constraint services_free_implies_zero_price
    check (is_free = false or price_minor = 0)
);

alter table services enable row level security;
create index services_hotel_id_idx on services (hotel_id);
create index services_category_id_idx on services (category_id);
create index services_department_id_idx on services (department_id);

create table service_translations (
  service_id   uuid not null references services (id) on delete cascade,
  hotel_id     uuid not null references hotels (id) on delete cascade,
  locale       text not null references languages (code),
  name         text not null,
  description  text,
  primary key (service_id, locale)
);

alter table service_translations enable row level security;
create index service_translations_hotel_id_idx on service_translations (hotel_id);

create table menu_categories (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references hotels (id) on delete cascade,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table menu_categories enable row level security;
create index menu_categories_hotel_id_idx on menu_categories (hotel_id);

create table menu_category_translations (
  menu_category_id  uuid not null references menu_categories (id) on delete cascade,
  hotel_id          uuid not null references hotels (id) on delete cascade,
  locale            text not null references languages (code),
  name              text not null,
  primary key (menu_category_id, locale)
);

alter table menu_category_translations enable row level security;
create index menu_category_translations_hotel_id_idx on menu_category_translations (hotel_id);

create table menu_items (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references hotels (id) on delete cascade,
  menu_category_id  uuid not null references menu_categories (id) on delete cascade,
  image_url         text,
  price_minor       integer not null,
  currency          char(3) not null default 'USD',
  prep_minutes      integer,
  allergens         text[] not null default array[]::text[],
  status            menu_item_status not null default 'available',
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint menu_items_price_non_negative check (price_minor >= 0)
);

alter table menu_items enable row level security;
create index menu_items_hotel_id_idx on menu_items (hotel_id);
create index menu_items_category_id_idx on menu_items (menu_category_id);

create table menu_item_translations (
  menu_item_id  uuid not null references menu_items (id) on delete cascade,
  hotel_id      uuid not null references hotels (id) on delete cascade,
  locale        text not null references languages (code),
  name          text not null,
  description   text,
  primary key (menu_item_id, locale)
);

alter table menu_item_translations enable row level security;
create index menu_item_translations_hotel_id_idx on menu_item_translations (hotel_id);
