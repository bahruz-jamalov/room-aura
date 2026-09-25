-- ROOM-AURA — QR/access tokens and guest sessions.
-- Only a hash of an access token is ever stored: a database dump yields no
-- working QR codes. Raw tokens exist only in the guest's URL and in the
-- moment the redeem-access edge function verifies them.

create table access_tokens (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references hotels (id) on delete cascade,
  room_id        uuid references rooms (id) on delete cascade, -- null = hotel-wide
  kind           access_kind not null,
  token_hash     text not null unique,
  label          text,
  is_active      boolean not null default true,
  expires_at     timestamptz,
  created_by     uuid references staff_users (id) on delete set null,
  last_used_at   timestamptz,
  created_at     timestamptz not null default now(),
  constraint access_tokens_room_required_for_room_kind
    check (kind <> 'room' or room_id is not null)
);

alter table access_tokens enable row level security;
create index access_tokens_hotel_id_idx on access_tokens (hotel_id);

-- Guest identity: Supabase anonymous auth bound to a room + language + expiry.
-- No name, email, phone or payment data — deliberate data minimisation.
create table guest_sessions (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references hotels (id) on delete cascade,
  room_id        uuid not null references rooms (id) on delete cascade,
  auth_user_id   uuid not null unique references auth.users (id) on delete cascade,
  locale         text not null references languages (code),
  source         access_kind not null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  last_seen_at   timestamptz not null default now(),
  revoked_at     timestamptz
);

alter table guest_sessions enable row level security;
create index guest_sessions_hotel_id_idx on guest_sessions (hotel_id);
create index guest_sessions_auth_user_id_idx on guest_sessions (auth_user_id);
