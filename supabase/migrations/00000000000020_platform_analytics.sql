-- ROOM-AURA — Phase 8 (Super Admin): platform_admins self-read policy plus
-- two cross-tenant aggregate RPCs.
--
-- Platform admin deliberately has NO row-level RLS grant on requests,
-- orders, or feedback (docs/ARCHITECTURE.md section 4: "not the right to
-- read an individual guest's messages") — only "counts only" via RPCs
-- taking an explicit hotel scope. These two functions are that sanctioned
-- exception: SECURITY DEFINER (so they can aggregate across every tenant),
-- but each checks is_platform_admin() itself as the first line, since
-- bypassing RLS means the function IS the security boundary here, not a
-- policy.

-- platform_admins had zero policies at all (default-deny), so a signed-in
-- platform admin couldn't even read their own full_name back — needed the
-- same way staff_users' "staff reads own row" lets AuthContext resolve a
-- hotel staff profile.
create policy "platform admin reads own row"
  on platform_admins for select to authenticated
  using (user_id = auth.uid());

create or replace function public.platform_hotel_stats(p_hotel_id uuid)
returns table (
  room_count integer,
  request_count bigint,
  completed_count bigint,
  order_count bigint,
  revenue_by_currency jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      (select count(*) from rooms where hotel_id = p_hotel_id)::integer,
      (select count(*) from requests where hotel_id = p_hotel_id),
      (select count(*) from requests where hotel_id = p_hotel_id and status = 'completed'::request_status),
      (select count(*) from requests where hotel_id = p_hotel_id and kind = 'order'::request_kind),
      (
        select coalesce(jsonb_object_agg(t.currency, t.total), '{}'::jsonb)
        from (
          select o.currency, sum(o.total_minor) as total
          from orders o
          join requests r on r.id = o.id
          where r.hotel_id = p_hotel_id and r.status <> 'cancelled'::request_status
          group by o.currency
        ) t
      );
end;
$$;

revoke execute on function public.platform_hotel_stats(uuid) from public;
grant execute on function public.platform_hotel_stats(uuid) to authenticated;

create or replace function public.platform_analytics()
returns table (
  total_hotels integer,
  active_hotels integer,
  total_requests bigint,
  total_orders bigint,
  revenue_by_currency jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      (select count(*) from hotels)::integer,
      (select count(*) from hotels where status = 'active'::hotel_status)::integer,
      (select count(*) from requests),
      (select count(*) from requests where kind = 'order'::request_kind),
      (
        select coalesce(jsonb_object_agg(t.currency, t.total), '{}'::jsonb)
        from (
          select o.currency, sum(o.total_minor) as total
          from orders o
          join requests r on r.id = o.id
          where r.status <> 'cancelled'::request_status
          group by o.currency
        ) t
      );
end;
$$;

revoke execute on function public.platform_analytics() from public;
grant execute on function public.platform_analytics() to authenticated;
