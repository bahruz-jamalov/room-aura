-- ROOM-AURA — fix create_order leaving orders.currency at its 'USD'
-- placeholder.
--
-- Bug found while verifying Phase 5's first real order: recompute_order_totals
-- (00000000000010_triggers.sql) recomputes subtotal_minor/total_minor/
-- item_count from order_items, but never touched currency, so the
-- placeholder inserted before the items loop survived untouched. This
-- assumes a single currency per hotel's menu — true for the demo data and a
-- reasonable MVP simplification (documented, not silently wrong).
create or replace function public.create_order(
  p_payment_method payment_method,
  p_note text,
  p_items jsonb
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

  select hotel_settings.fnb_department_id, (select hotels.default_locale from hotels where hotels.id = v_hotel_id)
    into v_department_id, v_default_locale
    from hotel_settings where hotel_settings.hotel_id = v_hotel_id;

  if v_department_id is null then
    raise exception 'this hotel has not configured a Food & Beverage department yet' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'an order needs at least one item' using errcode = '22023';
  end if;

  insert into requests (hotel_id, room_id, guest_session_id, kind, department_id, guest_note)
  values (v_hotel_id, v_room_id, v_guest_session_id, 'order', v_department_id, p_note)
  returning id into v_request_id;

  insert into orders (id, hotel_id, payment_method, subtotal_minor, total_minor, currency, item_count)
  values (v_request_id, v_hotel_id, p_payment_method, 0, 0, 'USD', 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);
    if v_quantity <= 0 then
      raise exception 'quantity must be positive' using errcode = '22023';
    end if;

    select menu_items.price_minor, menu_items.currency, menu_items.status
      into v_price_minor, v_currency, v_status
      from menu_items
      where menu_items.id = v_menu_item_id and menu_items.hotel_id = v_hotel_id;

    if not found then
      raise exception 'menu item not found' using errcode = 'P0002';
    end if;
    if v_status <> 'available' then
      raise exception 'menu item is not available' using errcode = 'P0002';
    end if;

    select coalesce(
      (select menu_item_translations.name from menu_item_translations
        where menu_item_translations.menu_item_id = v_menu_item_id and menu_item_translations.locale = v_default_locale),
      (select menu_item_translations.name from menu_item_translations
        where menu_item_translations.menu_item_id = v_menu_item_id and menu_item_translations.locale = 'en'),
      'Item'
    ) into v_name_snapshot;

    insert into order_items (order_id, hotel_id, menu_item_id, name_snapshot, unit_price_minor, quantity, line_total_minor, note)
    values (v_request_id, v_hotel_id, v_menu_item_id, v_name_snapshot, v_price_minor, v_quantity, v_price_minor * v_quantity, null);
  end loop;

  -- recompute_order_totals only touches subtotal/total/item_count; currency
  -- has to be set explicitly here (single-currency-per-hotel assumption).
  update orders set currency = v_currency where id = v_request_id;

  return query
    select r.id, r.number, o.total_minor, o.currency::text
    from requests r join orders o on o.id = r.id
    where r.id = v_request_id;
end;
$$;
