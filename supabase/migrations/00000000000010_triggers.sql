-- ROOM-AURA — Triggers: consistency, the request state machine, audit
-- history and guest notifications. Enforcing these in the database means a
-- UI bug (or a malicious client) cannot corrupt state that the RLS policies
-- above already gate access to.

-- ------------------------------------------------------------------------
-- 1. Generic updated_at bookkeeping
-- ------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on hotels
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on hotel_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on services
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on menu_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on staff_users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on requests
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------
-- 2. hotel_id on translation rows is always derived from the parent, never
--    trusted from the client — this is what keeps the RLS policies on
--    *_translations correct even if a caller sends the wrong hotel_id.
-- ------------------------------------------------------------------------
create or replace function public.set_hotel_id_from_service_category()
returns trigger language plpgsql as $$
begin
  select hotel_id into new.hotel_id from service_categories where id = new.category_id;
  return new;
end;
$$;

create trigger set_hotel_id before insert or update on service_category_translations
  for each row execute function public.set_hotel_id_from_service_category();

create or replace function public.set_hotel_id_from_service()
returns trigger language plpgsql as $$
begin
  select hotel_id into new.hotel_id from services where id = new.service_id;
  return new;
end;
$$;

create trigger set_hotel_id before insert or update on service_translations
  for each row execute function public.set_hotel_id_from_service();

create or replace function public.set_hotel_id_from_menu_category()
returns trigger language plpgsql as $$
begin
  select hotel_id into new.hotel_id from menu_categories where id = new.menu_category_id;
  return new;
end;
$$;

create trigger set_hotel_id before insert or update on menu_category_translations
  for each row execute function public.set_hotel_id_from_menu_category();

create or replace function public.set_hotel_id_from_menu_item()
returns trigger language plpgsql as $$
begin
  select hotel_id into new.hotel_id from menu_items where id = new.menu_item_id;
  return new;
end;
$$;

create trigger set_hotel_id before insert or update on menu_item_translations
  for each row execute function public.set_hotel_id_from_menu_item();

-- ------------------------------------------------------------------------
-- 3. The request/order state machine (docs/ARCHITECTURE.md section 8).
--    Enforced here so it holds regardless of which client (or role) issues
--    the UPDATE — RLS decides WHO may touch a row, this decides WHETHER the
--    transition they're attempting is legal.
-- ------------------------------------------------------------------------
create or replace function public.validate_request_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'new'         and new.status in ('accepted', 'cancelled')) or
    (old.status = 'accepted'    and new.status in ('in_progress', 'on_the_way', 'completed', 'cancelled')) or
    (old.status = 'in_progress' and new.status in ('on_the_way', 'completed', 'cancelled')) or
    (old.status = 'on_the_way'  and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'Invalid request status transition: % -> %', old.status, new.status
      using errcode = '23514'; -- check_violation
  end if;

  -- Stamp the timestamp for whichever state we're entering, if not already set.
  case new.status
    when 'accepted'    then new.accepted_at    = coalesce(new.accepted_at, now());
    when 'in_progress' then new.started_at     = coalesce(new.started_at, now());
    when 'on_the_way'  then new.on_the_way_at  = coalesce(new.on_the_way_at, now());
    when 'completed'   then new.completed_at   = coalesce(new.completed_at, now());
    when 'cancelled'   then new.cancelled_at   = coalesce(new.cancelled_at, now());
    else null;
  end case;

  return new;
end;
$$;

create trigger validate_request_status_transition
  before update of status on requests
  for each row execute function public.validate_request_status_transition();

-- ------------------------------------------------------------------------
-- 4. Automatic audit trail + guest notification on every status change.
--    This is what makes request_status_history authoritative: staff and
--    guests can never fake or skip an entry by calling the API directly.
-- ------------------------------------------------------------------------
create or replace function public.record_request_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor_type actor_type;
  v_actor_staff_id uuid;
begin
  if (select id from staff_users where id = auth.uid()) is not null then
    v_actor_type := 'staff';
    v_actor_staff_id := auth.uid();
  elsif (select id from guest_sessions where auth_user_id = auth.uid()) is not null then
    v_actor_type := 'guest';
  else
    v_actor_type := 'system';
  end if;

  insert into request_status_history
    (request_id, hotel_id, event_type, from_status, to_status, actor_type, actor_staff_id)
  values
    (new.id, new.hotel_id, 'status_change',
     case when tg_op = 'INSERT' then null else old.status end,
     new.status, v_actor_type, v_actor_staff_id);

  if new.status <> 'cancelled' or tg_op = 'INSERT' then
    insert into notifications
      (hotel_id, audience, guest_session_id, request_id, type_key, params)
    values
      (new.hotel_id, 'guest', new.guest_session_id, new.id, 'request.status_changed',
       jsonb_build_object('status', new.status, 'requestNumber', new.number, 'kind', new.kind));
  end if;

  return new;
end;
$$;

create trigger record_request_status_change_on_insert
  after insert on requests
  for each row execute function public.record_request_status_change();

create trigger record_request_status_change_on_update
  after update of status on requests
  for each row execute function public.record_request_status_change();

-- ------------------------------------------------------------------------
-- 5. Order totals are always derived from order_items, never trusted from
--    the client — this is the integrity guarantee behind "revenue".
-- ------------------------------------------------------------------------
create or replace function public.recompute_order_totals()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
begin
  update orders o
  set subtotal_minor = coalesce(agg.subtotal, 0),
      total_minor     = coalesce(agg.subtotal, 0), -- no taxes/fees in MVP
      item_count      = coalesce(agg.items, 0)
  from (
    select sum(line_total_minor) as subtotal, sum(quantity) as items
    from order_items where order_id = v_order_id
  ) agg
  where o.id = v_order_id;
  return null;
end;
$$;

create trigger recompute_order_totals_on_change
  after insert or update or delete on order_items
  for each row execute function public.recompute_order_totals();
