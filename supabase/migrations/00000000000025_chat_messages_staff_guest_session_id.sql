-- Fixes a bug in 00000000000024_chat.sql: chat_messages.guest_session_id is
-- not null (so a guest's own-session RLS select also returns staff replies
-- in the same thread), but staff sends never had a guest_session_id to
-- supply — every staff reply failed with a not-null violation. Backfill it
-- from the parent thread instead of requiring the client to know it.

create or replace function public.set_chat_message_guest_session_id()
returns trigger
language plpgsql
as $$
begin
  if new.guest_session_id is null then
    select guest_session_id into new.guest_session_id
    from chat_threads
    where id = new.thread_id;
  end if;
  return new;
end;
$$;

create trigger set_chat_message_guest_session_id
  before insert on chat_messages
  for each row execute function public.set_chat_message_guest_session_id();
