-- ROOM-AURA — Independent "shops" for the 'menu' category type, plus
-- one level of category grouping ("Explore the City" as an umbrella tile
-- over "City Restaurants" / "City Shops").
--
-- Until now every menu_categories row was one flat, hotel-wide Food & Drinks
-- list, and create_order always routed every order to
-- hotel_settings.fnb_department_id. That doesn't work for "Explore the
-- City": an external restaurant/shop with its own orderable items needs its
-- own set of menu_categories and its own fulfilling department, separate
-- from the hotel's own Food & Drinks.

-- A category with children is a group tile (e.g. "Explore the City"): the
-- guest app shows its children instead of services/a menu when it's
-- opened. One level deep only — a child is never itself a group. Whether a
-- category "is a group" is derived (does anything reference it as parent),
-- not stored, so this needs no new category_type value.
alter table service_categories
  add column parent_category_id uuid references service_categories (id) on delete cascade;

create index service_categories_parent_category_id_idx on service_categories (parent_category_id);

alter table menu_categories
  add column service_category_id uuid references service_categories (id) on delete cascade;

-- Backfill: every existing menu_categories row belongs to whichever
-- 'menu'-type service_categories row its hotel already has — there was at
-- most one per hotel before this migration (the Food & Drinks tile).
update menu_categories mc
set service_category_id = sc.id
from service_categories sc
where sc.hotel_id = mc.hotel_id
  and sc.category_type = 'menu'
  and mc.service_category_id is null;

alter table menu_categories
  alter column service_category_id set not null;

create index menu_categories_service_category_id_idx on menu_categories (service_category_id);

-- Which department fulfils orders placed against a given 'menu'-type
-- category. Nullable: when unset, create_order falls back to
-- hotel_settings.fnb_department_id, so the original Food & Drinks category
-- keeps working without every hotel having to re-point it.
alter table service_categories
  add column department_id uuid references departments (id) on delete set null;

-- Backfill the existing Food & Drinks category explicitly.
update service_categories sc
set department_id = hs.fnb_department_id
from hotel_settings hs
where hs.hotel_id = sc.hotel_id
  and sc.category_type = 'menu'
  and hs.fnb_department_id is not null
  and sc.department_id is null;

-- create_order: resolve the fulfilling department from the items' shop
-- (service_categories.department_id via menu_categories.service_category_id)
-- instead of always using hotel_settings.fnb_department_id, falling back to
-- it when a shop hasn't set its own department yet. Every item in one order
-- must come from the same shop — two independent shops in one checkout
-- would have two different fulfillers, which the single `requests` row
-- this creates can't represent.
create or replace function public.create_order(
  p_payment_method payment_method,
  p_note text,
  p_items jsonb
)
returns table (request_id uuid, request_number text, total_minor integer, currency text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid := guest_hotel_id();
  v_room_id uuid := guest_room_id();
  v_guest_session_id uuid := guest_session_id();
  v_default_locale text;
  v_fnb_department_id uuid;
  v_department_id uuid;
  v_shop_category_id uuid;
  v_item_shop_category_id uuid;
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
    into v_fnb_department_id, v_default_locale
    from hotel_settings where hotel_settings.hotel_id = v_hotel_id;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'an order needs at least one item' using errcode = '22023';
  end if;

  -- Pass 1: find which shop this order belongs to, and make sure every
  -- item agrees — before touching `requests`, since department_id is
  -- required on insert.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;

    select menu_categories.service_category_id into v_item_shop_category_id
      from menu_items
      join menu_categories on menu_categories.id = menu_items.menu_category_id
      where menu_items.id = v_menu_item_id and menu_items.hotel_id = v_hotel_id;

    if not found then
      raise exception 'menu item not found' using errcode = 'P0002';
    end if;
    if v_shop_category_id is null then
      v_shop_category_id := v_item_shop_category_id;
    elsif v_shop_category_id <> v_item_shop_category_id then
      raise exception 'all items in an order must be from the same shop' using errcode = '22023';
    end if;
  end loop;

  select service_categories.department_id into v_department_id
    from service_categories where service_categories.id = v_shop_category_id;
  v_department_id := coalesce(v_department_id, v_fnb_department_id);

  if v_department_id is null then
    raise exception 'this shop has not configured a fulfilling department yet' using errcode = 'P0001';
  end if;

  insert into requests (hotel_id, room_id, guest_session_id, kind, department_id, guest_note)
  values (v_hotel_id, v_room_id, v_guest_session_id, 'order', v_department_id, p_note)
  returning id into v_request_id;

  -- Placeholder totals — recomputed from order_items, then currency is
  -- patched below once it's known from the items themselves.
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

  update orders set currency = v_currency where id = v_request_id;

  return query
    select r.id, r.number, o.total_minor, o.currency::text
    from requests r join orders o on o.id = r.id
    where r.id = v_request_id;
end;
$$;

revoke execute on function public.create_order(payment_method, text, jsonb) from public;
grant execute on function public.create_order(payment_method, text, jsonb) to authenticated;
