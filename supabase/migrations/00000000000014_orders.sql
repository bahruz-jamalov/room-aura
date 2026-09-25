-- ROOM-AURA — Phase 5: ordering.
--
-- hotel_settings.fnb_department_id mirrors freetext_department_id's pattern
-- (docs/ARCHITECTURE.md section 9) — orders need a department to route to,
-- same as free-text requests do, and there's no other natural source for it.
alter table hotel_settings
  add column fnb_department_id uuid references departments (id) on delete set null;

-- create_order: the one place an order is ever created. SECURITY INVOKER
-- (the default) on purpose — it runs as the calling guest, so every insert
-- inside it still has to satisfy the existing RLS policies on requests/
-- orders/order_items exactly as if the guest had issued them directly. This
-- function exists only to make the three-table write atomic and to make
-- prices/currency authoritative from `menu_items` rather than trusting
-- whatever the client sends.
create or replace function public.create_order(
  p_payment_method payment_method,
  p_note text,
  p_items jsonb -- [{ "menu_item_id": "<uuid>", "quantity": 2 }, ...]
)
returns table (request_id uuid, request_number text, total_minor integer, currency text)
language plpgsql
as $$
declare
  v_hotel_id uuid := guest_hotel_id();
  v_room_id uuid := guest_room_id();
  v_guest_session_id uuid := guest_session_id();
  v_default_locale text;
  v_department_id uuid;
  v_request_id uuid;
  v_item jsonb;
  v_menu_item_id uuid;
  v_quantity integer;
  v_price_minor integer;
  v_currency char(3);
  v_status menu_item_status;
  v_name_snapshot text;
begin
  if v_hotel_id is null or v_room_id is null or v_guest_session_id is null then
    raise exception 'no active guest session' using errcode = '42501';
  end if;

  select fnb_department_id, (select default_locale from hotels where id = v_hotel_id)
    into v_department_id, v_default_locale
    from hotel_settings where hotel_id = v_hotel_id;

  if v_department_id is null then
    raise exception 'this hotel has not configured a Food & Beverage department yet' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'an order needs at least one item' using errcode = '22023';
  end if;

  insert into requests (hotel_id, room_id, guest_session_id, kind, department_id, guest_note)
  values (v_hotel_id, v_room_id, v_guest_session_id, 'order', v_department_id, p_note)
  returning id into v_request_id;

  -- Placeholder totals — recompute_order_totals (00000000000010_triggers.sql)
  -- overwrites subtotal/total/item_count from order_items right below.
  insert into orders (id, hotel_id, payment_method, subtotal_minor, total_minor, currency, item_count)
  values (v_request_id, v_hotel_id, p_payment_method, 0, 0, 'USD', 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);
    if v_quantity <= 0 then
      raise exception 'quantity must be positive' using errcode = '22023';
    end if;

    select price_minor, currency, status
      into v_price_minor, v_currency, v_status
      from menu_items
      where id = v_menu_item_id and hotel_id = v_hotel_id;

    if not found then
      raise exception 'menu item not found' using errcode = 'P0002';
    end if;
    if v_status <> 'available' then
      raise exception 'menu item is not available' using errcode = 'P0002';
    end if;

    select coalesce(
      (select name from menu_item_translations where menu_item_id = v_menu_item_id and locale = v_default_locale),
      (select name from menu_item_translations where menu_item_id = v_menu_item_id and locale = 'en'),
      'Item'
    ) into v_name_snapshot;

    insert into order_items (order_id, hotel_id, menu_item_id, name_snapshot, unit_price_minor, quantity, line_total_minor, note)
    values (v_request_id, v_hotel_id, v_menu_item_id, v_name_snapshot, v_price_minor, v_quantity, v_price_minor * v_quantity, null);
  end loop;

  return query
    select r.id, r.number, o.total_minor, o.currency
    from requests r join orders o on o.id = r.id
    where r.id = v_request_id;
end;
$$;

-- Callable via supabase.rpc('create_order', ...) by guests specifically.
revoke execute on function public.create_order(payment_method, text, jsonb) from public;
grant execute on function public.create_order(payment_method, text, jsonb) to authenticated;

-- So the admin dashboard's revenue KPI can react live if an order's total
-- is ever adjusted independently of its parent request changing.
alter publication supabase_realtime add table orders;
