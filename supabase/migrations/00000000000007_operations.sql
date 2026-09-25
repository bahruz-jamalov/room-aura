-- ROOM-AURA — The operational spine: requests, orders, history, feedback,
-- notifications, routing rules.
--
-- `requests` is ONE table for structured service requests, free-text
-- messages and food/drink orders (kind). An order additionally gets a 1:1
-- `orders` row for commercial data. One queue, one state machine, one
-- realtime channel, one audit trail — see docs/ARCHITECTURE.md section 3.

create sequence request_number_seq start 1001;

create table requests (
  id                     uuid primary key default gen_random_uuid(),
  hotel_id               uuid not null references hotels (id) on delete cascade,
  room_id                uuid not null references rooms (id) on delete restrict,
  guest_session_id       uuid not null references guest_sessions (id) on delete restrict,
  number                 text not null unique default ('RA-' || nextval('request_number_seq')),
  kind                   request_kind not null,
  service_id             uuid references services (id) on delete restrict,
  department_id          uuid not null references departments (id) on delete restrict,
  status                 request_status not null default 'new',
  quantity               integer not null default 1,
  guest_note             text,
  -- Free-text ("Other Request") fields — see docs/ARCHITECTURE.md section 9.
  original_text          text,
  original_locale        text references languages (code),
  translated_text        text,
  translation_provider   text,
  translation_is_mock    boolean not null default true,
  assigned_to            uuid references staff_users (id) on delete set null,
  estimated_minutes      integer,
  accepted_at            timestamptz,
  started_at             timestamptz,
  on_the_way_at          timestamptz,
  completed_at           timestamptz,
  cancelled_at           timestamptz,
  cancel_reason          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint requests_quantity_positive check (quantity > 0),
  constraint requests_service_required_for_service_kind
    check (kind <> 'service' or service_id is not null),
  constraint requests_freetext_requires_original_text
    check (kind <> 'freetext' or original_text is not null)
);

alter table requests enable row level security;
create index requests_hotel_id_idx on requests (hotel_id);
create index requests_hotel_status_idx on requests (hotel_id, status);
create index requests_department_id_idx on requests (department_id);
create index requests_guest_session_id_idx on requests (guest_session_id);
create index requests_room_id_idx on requests (room_id);

create table request_status_history (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references requests (id) on delete cascade,
  hotel_id         uuid not null references hotels (id) on delete cascade,
  event_type       event_type not null,
  from_status      request_status,
  to_status        request_status,
  note             text,
  actor_type       actor_type not null,
  actor_staff_id   uuid references staff_users (id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table request_status_history enable row level security;
create index request_status_history_request_id_idx on request_status_history (request_id);
create index request_status_history_hotel_id_idx on request_status_history (hotel_id);

-- 1:1 extension of requests for kind = 'order'. id IS the request id.
create table orders (
  id              uuid primary key references requests (id) on delete cascade,
  hotel_id        uuid not null references hotels (id) on delete cascade,
  payment_method  payment_method not null,
  subtotal_minor  integer not null,
  total_minor     integer not null,
  currency        char(3) not null,
  item_count      integer not null default 0,
  constraint orders_totals_non_negative
    check (subtotal_minor >= 0 and total_minor >= 0)
);

alter table orders enable row level security;
create index orders_hotel_id_idx on orders (hotel_id);

create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  hotel_id          uuid not null references hotels (id) on delete cascade,
  menu_item_id      uuid references menu_items (id) on delete set null,
  name_snapshot     text not null,
  unit_price_minor  integer not null,
  quantity          integer not null,
  line_total_minor  integer not null,
  note              text,
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_prices_non_negative
    check (unit_price_minor >= 0 and line_total_minor >= 0)
);

alter table order_items enable row level security;
create index order_items_order_id_idx on order_items (order_id);
create index order_items_hotel_id_idx on order_items (hotel_id);

create table feedback (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null unique references requests (id) on delete cascade,
  hotel_id          uuid not null references hotels (id) on delete cascade,
  guest_session_id  uuid not null references guest_sessions (id) on delete restrict,
  rating            smallint not null,
  effort_score      smallint not null,
  comment           text,
  locale            text references languages (code),
  created_at        timestamptz not null default now(),
  constraint feedback_rating_range check (rating between 1 and 5),
  constraint feedback_effort_range check (effort_score between 1 and 5)
);

alter table feedback enable row level security;
create index feedback_hotel_id_idx on feedback (hotel_id);

-- Notifications store a type_key + params, never a rendered sentence, so the
-- guest app renders them through i18next and a new language needs no backend
-- change. See docs/ARCHITECTURE.md section 3.
create table notifications (
  id                 uuid primary key default gen_random_uuid(),
  hotel_id           uuid not null references hotels (id) on delete cascade,
  audience           notification_audience not null,
  guest_session_id   uuid references guest_sessions (id) on delete cascade,
  staff_user_id      uuid references staff_users (id) on delete cascade,
  department_id      uuid references departments (id) on delete cascade,
  request_id         uuid references requests (id) on delete cascade,
  type_key           text not null,
  params             jsonb not null default '{}'::jsonb,
  read_at            timestamptz,
  created_at         timestamptz not null default now(),
  constraint notifications_target_present check (
    guest_session_id is not null or staff_user_id is not null or department_id is not null
  )
);

alter table notifications enable row level security;
create index notifications_hotel_id_idx on notifications (hotel_id);
create index notifications_guest_session_id_idx on notifications (guest_session_id);
create index notifications_staff_user_id_idx on notifications (staff_user_id);
create index notifications_department_id_idx on notifications (department_id);

-- Free-text routing: keyword match on the *translated* text, highest
-- priority wins, falling back to hotel_settings.freetext_department_id.
-- Deliberately simple and hotel-editable; NLP intent classification is
-- explicitly POST-MVP (docs/ARCHITECTURE.md section 9).
create table routing_rules (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references hotels (id) on delete cascade,
  keyword        text not null,
  department_id  uuid not null references departments (id) on delete cascade,
  priority       integer not null default 0
);

alter table routing_rules enable row level security;
create index routing_rules_hotel_id_idx on routing_rules (hotel_id);
