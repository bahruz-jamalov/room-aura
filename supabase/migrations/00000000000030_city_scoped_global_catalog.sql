-- ROOM-AURA — City-scope the shared "Explore the City" catalogue.
--
-- A global (hotel_id is null) entry represents one real-world vendor in one
-- real city — a Dubai pharmacy has no business appearing for a guest at the
-- Lisbon hotel. `city` is denormalised onto every catalogue table exactly
-- like `hotel_id` already is, for the same reason (00000000000005_
-- catalogue.sql's comment): a single-predicate RLS policy, no join.
-- Meaningless (and left null) for a hotel-owned row — that row is already
-- scoped by hotel_id.

alter table service_categories add column city text;
alter table service_category_translations add column city text;
alter table services add column city text;
alter table service_translations add column city text;
alter table menu_categories add column city text;
alter table menu_category_translations add column city text;
alter table menu_items add column city text;
alter table menu_item_translations add column city text;

alter table service_categories
  add constraint service_categories_global_requires_city check (hotel_id is not null or city is not null);
alter table services
  add constraint services_global_requires_city check (hotel_id is not null or city is not null);
alter table menu_categories
  add constraint menu_categories_global_requires_city check (hotel_id is not null or city is not null);
alter table menu_items
  add constraint menu_items_global_requires_city check (hotel_id is not null or city is not null);

create index service_categories_city_idx on service_categories (city) where city is not null;
create index services_city_idx on services (city) where city is not null;
create index menu_categories_city_idx on menu_categories (city) where city is not null;
create index menu_items_city_idx on menu_items (city) where city is not null;

-- The calling guest's hotel's city — same pattern as guest_hotel_id() etc.
-- in 00000000000008_auth_helpers.sql.
create or replace function public.guest_hotel_city()
returns text
language sql stable security definer set search_path = public
as $$
  select hotels.city
  from guest_sessions
  join hotels on hotels.id = guest_sessions.hotel_id
  where guest_sessions.auth_user_id = auth.uid()
    and guest_sessions.revoked_at is null
    and guest_sessions.expires_at > now()
  order by guest_sessions.created_at desc
  limit 1
$$;

-- ================================================== guest read policies
-- Re-narrow every "… or global" guest SELECT policy added in
-- 00000000000029_global_catalog.sql: a global row is only visible when its
-- city matches the guest's own hotel's city.

drop policy "guest reads active categories of own hotel or global" on service_categories;
create policy "guest reads active categories of own hotel or global city"
  on service_categories for select to authenticated
  using (
    (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())))
    and is_active
  );

drop policy "guest reads category translations of own hotel or global" on service_category_translations;
create policy "guest reads category translations of own hotel or global city"
  on service_category_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())));

drop policy "guest reads active services of own hotel or global" on services;
create policy "guest reads active services of own hotel or global city"
  on services for select to authenticated
  using (
    (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())))
    and is_active
  );

drop policy "guest reads service translations of own hotel or global" on service_translations;
create policy "guest reads service translations of own hotel or global city"
  on service_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())));

drop policy "guest reads active menu categories of own hotel or global" on menu_categories;
create policy "guest reads active menu categories of own hotel or global city"
  on menu_categories for select to authenticated
  using (
    (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())))
    and is_active
  );

drop policy "guest reads menu category translations of own hotel or global" on menu_category_translations;
create policy "guest reads menu category translations of own hotel or global city"
  on menu_category_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())));

drop policy "guest reads visible menu items of own hotel or global" on menu_items;
create policy "guest reads visible menu items of own hotel or global city"
  on menu_items for select to authenticated
  using (
    (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())))
    and status <> 'hidden'::menu_item_status
  );

drop policy "guest reads menu item translations of own hotel or global" on menu_item_translations;
create policy "guest reads menu item translations of own hotel or global city"
  on menu_item_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or (hotel_id is null and city = (select guest_hotel_city())));

-- ======================================================== create_order
-- A SECURITY DEFINER function bypasses RLS, so it has to re-check the city
-- match itself — otherwise a guest could pass a menu_item_id belonging to
-- another city's global shop despite never being able to see it.
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
  v_hotel_city text;
  v_default_locale text;
  v_fnb_department_id uuid;
  v_city_services_department_id uuid;
  v_department_id uuid;
  v_shop_category_id uuid;
  v_shop_hotel_id uuid;
  v_item_shop_category_id uuid;
  v_request_id uuid;
  v_item jsonb;
  v_menu_item_id uuid;
  v_quantity integer;
  v_price_minor integer;
  v_currency char(3);
  v_status menu_item_status;
  v_name_snapshot text;
  v_is_global_shop boolean;
begin
  if v_hotel_id is null or v_room_id is null or v_guest_session_id is null then
    raise exception 'no active guest session' using errcode = '42501';
  end if;

  select hotel_settings.fnb_department_id, hotel_settings.city_services_department_id,
         (select hotels.default_locale from hotels where hotels.id = v_hotel_id),
         (select hotels.city from hotels where hotels.id = v_hotel_id)
    into v_fnb_department_id, v_city_services_department_id, v_default_locale, v_hotel_city
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
      where menu_items.id = v_menu_item_id
        and (
          menu_items.hotel_id = v_hotel_id
          or (menu_items.hotel_id is null and menu_items.city = v_hotel_city)
        );

    if not found then
      raise exception 'menu item not found' using errcode = 'P0002';
    end if;
    if v_shop_category_id is null then
      v_shop_category_id := v_item_shop_category_id;
    elsif v_shop_category_id <> v_item_shop_category_id then
      raise exception 'all items in an order must be from the same shop' using errcode = '22023';
    end if;
  end loop;

  select service_categories.department_id, service_categories.hotel_id
    into v_department_id, v_shop_hotel_id
    from service_categories where service_categories.id = v_shop_category_id;
  v_is_global_shop := v_shop_hotel_id is null;

  if v_is_global_shop then
    v_department_id := v_city_services_department_id;
    if v_department_id is null then
      raise exception 'this hotel has not configured a department for Explore the City orders yet' using errcode = 'P0001';
    end if;
  else
    v_department_id := coalesce(v_department_id, v_fnb_department_id);
    if v_department_id is null then
      raise exception 'this shop has not configured a fulfilling department yet' using errcode = 'P0001';
    end if;
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
      where menu_items.id = v_menu_item_id
        and (
          menu_items.hotel_id = v_hotel_id
          or (menu_items.hotel_id is null and menu_items.city = v_hotel_city)
        );

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
