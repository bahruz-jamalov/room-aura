-- ROOM-AURA — Platform-wide ("global") catalogue entries.
--
-- "Explore the City" services (an external pharmacy, electronics store,
-- travel agency, car rental, …) have nothing to do with which hotel the
-- guest is staying at — the same vendor serves every hotel on the
-- platform. Modelling them as one hotel's private catalogue would mean
-- every hotel re-creating the identical rows, and a guest at hotel B never
-- seeing hotel A's copy. Instead: hotel_id becomes nullable across the
-- catalogue tables, and NULL means "every hotel's guests see this" —
-- maintained by the platform admin only, never a hotel's own staff.
--
-- Orders/requests stay hotel_id NOT NULL throughout (a specific guest's
-- specific room always belongs to exactly one hotel); only the catalogue
-- definitions become shareable.

alter table service_categories alter column hotel_id drop not null;
alter table service_category_translations alter column hotel_id drop not null;
alter table services alter column hotel_id drop not null;
alter table services alter column department_id drop not null; -- a global service has no single hotel's department
alter table service_translations alter column hotel_id drop not null;
alter table menu_categories alter column hotel_id drop not null;
alter table menu_category_translations alter column hotel_id drop not null;
alter table menu_items alter column hotel_id drop not null;
alter table menu_item_translations alter column hotel_id drop not null;

-- Which of ITS OWN departments a hotel routes "Explore the City"
-- bookings/orders to (typically Guest Relations) — since the shop/service
-- itself no longer has a hotel-specific department to carry that.
alter table hotel_settings
  add column city_services_department_id uuid references departments (id) on delete set null;

-- ================================================== guest/staff read access
-- Every existing guest/staff SELECT policy below is replaced to additionally
-- admit hotel_id is null rows — a global catalogue entry is visible
-- alongside the caller's own hotel's rows, same predicate shape throughout.

drop policy "guest reads active categories of own hotel" on service_categories;
create policy "guest reads active categories of own hotel or global"
  on service_categories for select to authenticated
  using ((hotel_id = (select guest_hotel_id()) or hotel_id is null) and is_active);

drop policy "staff reads own hotel categories" on service_categories;
create policy "staff reads own hotel categories or global"
  on service_categories for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global categories"
  on service_categories for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads category translations of own hotel" on service_category_translations;
create policy "guest reads category translations of own hotel or global"
  on service_category_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or hotel_id is null);

drop policy "staff reads own hotel category translations" on service_category_translations;
create policy "staff reads own hotel category translations or global"
  on service_category_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global category translations"
  on service_category_translations for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads active services of own hotel" on services;
create policy "guest reads active services of own hotel or global"
  on services for select to authenticated
  using ((hotel_id = (select guest_hotel_id()) or hotel_id is null) and is_active);

drop policy "staff reads own hotel services" on services;
create policy "staff reads own hotel services or global"
  on services for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global services"
  on services for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads service translations of own hotel" on service_translations;
create policy "guest reads service translations of own hotel or global"
  on service_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or hotel_id is null);

drop policy "staff reads own hotel service translations" on service_translations;
create policy "staff reads own hotel service translations or global"
  on service_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global service translations"
  on service_translations for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads active menu categories of own hotel" on menu_categories;
create policy "guest reads active menu categories of own hotel or global"
  on menu_categories for select to authenticated
  using ((hotel_id = (select guest_hotel_id()) or hotel_id is null) and is_active);

drop policy "staff reads own hotel menu categories" on menu_categories;
create policy "staff reads own hotel menu categories or global"
  on menu_categories for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global menu categories"
  on menu_categories for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads menu category translations of own hotel" on menu_category_translations;
create policy "guest reads menu category translations of own hotel or global"
  on menu_category_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or hotel_id is null);

drop policy "staff reads own hotel menu category translations" on menu_category_translations;
create policy "staff reads own hotel menu category translations or global"
  on menu_category_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global menu category translations"
  on menu_category_translations for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads visible menu items of own hotel" on menu_items;
create policy "guest reads visible menu items of own hotel or global"
  on menu_items for select to authenticated
  using ((hotel_id = (select guest_hotel_id()) or hotel_id is null) and status <> 'hidden'::menu_item_status);

drop policy "staff reads own hotel menu items" on menu_items;
create policy "staff reads own hotel menu items or global"
  on menu_items for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global menu items"
  on menu_items for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

drop policy "guest reads menu item translations of own hotel" on menu_item_translations;
create policy "guest reads menu item translations of own hotel or global"
  on menu_item_translations for select to authenticated
  using (hotel_id = (select guest_hotel_id()) or hotel_id is null);

drop policy "staff reads own hotel menu item translations" on menu_item_translations;
create policy "staff reads own hotel menu item translations or global"
  on menu_item_translations for select to authenticated
  using (hotel_id = (select auth_hotel_id()) or hotel_id is null);

create policy "platform manages global menu item translations"
  on menu_item_translations for all to authenticated
  using (hotel_id is null and (select is_platform_admin()))
  with check (hotel_id is null and (select is_platform_admin()));

-- ======================================================== create_order
-- A global shop (service_categories.hotel_id is null) has no department of
-- its own — route it through the ordering guest's OWN hotel_settings
-- .city_services_department_id instead. A hotel-owned shop keeps its
-- existing department_id / fnb_department_id fallback unchanged.
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
         (select hotels.default_locale from hotels where hotels.id = v_hotel_id)
    into v_fnb_department_id, v_city_services_department_id, v_default_locale
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
        and (menu_items.hotel_id = v_hotel_id or menu_items.hotel_id is null);

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
        and (menu_items.hotel_id = v_hotel_id or menu_items.hotel_id is null);

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
