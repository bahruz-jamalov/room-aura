-- ROOM-AURA — Hotel FAQs, for the native app's chat assistant.
--
-- Deliberately dumb keyword matching (same philosophy as routing_rules for
-- freetext requests, see docs/ARCHITECTURE.md section 9) rather than an
-- AI/embedding search: no external API key needed, and staff can audit
-- exactly why a question matched. Staff manage these from the admin panel;
-- the chat assistant falls back to "talk to staff" (chat_threads) when
-- nothing matches.

create table hotel_faqs (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references hotels (id) on delete cascade,
  keyword     text not null,
  question    text not null,
  answer      text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index hotel_faqs_hotel_id_idx on hotel_faqs (hotel_id);

create trigger set_updated_at before update on hotel_faqs
  for each row execute function public.set_updated_at();

alter table hotel_faqs enable row level security;

create policy "guest reads own hotel active faqs"
  on hotel_faqs for select to authenticated
  using (hotel_id = (select guest_hotel_id()) and is_active);

create policy "staff reads own hotel faqs"
  on hotel_faqs for select to authenticated
  using (hotel_id = (select auth_hotel_id()));

create policy "admin or manager manages own hotel faqs"
  on hotel_faqs for all to authenticated
  using (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()))
  with check (hotel_id = (select auth_hotel_id()) and (select is_admin_or_manager()));
