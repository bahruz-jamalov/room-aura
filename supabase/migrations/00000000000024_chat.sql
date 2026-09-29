-- ROOM-AURA — Guest <-> staff live chat, the escalation path when the
-- native app's FAQ keyword match (hotel_faqs) comes up empty.
--
-- hotel_id and guest_session_id are denormalised onto chat_messages
-- (not just reachable via a join through chat_threads) so RLS policies
-- stay flat index lookups, matching every other guest-facing table here
-- (requests, feedback) rather than introducing this table's own join-based
-- policy style.

create type chat_thread_status as enum ('open', 'closed');
create type chat_sender_type as enum ('guest', 'staff');

create table chat_threads (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references hotels (id) on delete cascade,
  room_id           uuid not null references rooms (id) on delete cascade,
  guest_session_id  uuid not null references guest_sessions (id) on delete cascade,
  status            chat_thread_status not null default 'open',
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz not null default now()
);

create index chat_threads_hotel_id_idx on chat_threads (hotel_id);
create index chat_threads_guest_session_id_idx on chat_threads (guest_session_id);

create table chat_messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references chat_threads (id) on delete cascade,
  hotel_id          uuid not null references hotels (id) on delete cascade,
  guest_session_id  uuid not null references guest_sessions (id) on delete cascade,
  sender_type       chat_sender_type not null,
  staff_user_id     uuid references staff_users (id) on delete set null,
  body              text not null,
  created_at        timestamptz not null default now(),
  constraint chat_messages_sender_matches_staff_id check (
    (sender_type = 'staff' and staff_user_id is not null)
    or (sender_type = 'guest' and staff_user_id is null)
  )
);

create index chat_messages_thread_id_idx on chat_messages (thread_id);
create index chat_messages_hotel_id_idx on chat_messages (hotel_id);

-- Keeps the inbox sortable by recency without a join/aggregate on every
-- staff list screen load.
create or replace function public.bump_chat_thread_last_message()
returns trigger
language plpgsql
as $$
begin
  update chat_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger bump_chat_thread_last_message after insert on chat_messages
  for each row execute function public.bump_chat_thread_last_message();

alter table chat_threads enable row level security;
alter table chat_messages enable row level security;

create policy "guest reads own chat threads"
  on chat_threads for select to authenticated
  using (guest_session_id = (select guest_session_id()));

create policy "guest creates own chat thread"
  on chat_threads for insert to authenticated
  with check (
    hotel_id = (select guest_hotel_id())
    and room_id = (select guest_room_id())
    and guest_session_id = (select guest_session_id())
  );

create policy "staff reads own hotel chat threads"
  on chat_threads for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "staff updates own hotel chat threads"
  on chat_threads for update to authenticated
  using (hotel_id = (select auth_hotel_id()))
  with check (hotel_id = (select auth_hotel_id()));

create policy "guest reads own thread messages"
  on chat_messages for select to authenticated
  using (guest_session_id = (select guest_session_id()));

create policy "guest sends own thread messages"
  on chat_messages for insert to authenticated
  with check (
    guest_session_id = (select guest_session_id())
    and sender_type = 'guest'
    and hotel_id = (select guest_hotel_id())
  );

create policy "staff reads own hotel thread messages"
  on chat_messages for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "staff sends own hotel thread messages"
  on chat_messages for insert to authenticated
  with check (
    hotel_id = (select auth_hotel_id())
    and sender_type = 'staff'
    and staff_user_id = auth.uid()
  );

alter publication supabase_realtime add table chat_threads;
alter publication supabase_realtime add table chat_messages;
