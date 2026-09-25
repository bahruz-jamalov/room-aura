-- ROOM-AURA — RLS helper functions.
--
-- Every one is STABLE and SECURITY DEFINER with a pinned search_path, and is
-- called from policies wrapped in `(select fn())` so Postgres evaluates it
-- once per statement rather than once per row. SECURITY DEFINER is required
-- here: these functions read staff_users / guest_sessions, which themselves
-- have RLS enabled, so the functions must bypass it deliberately in order to
-- answer "who is asking?" at all.

create or replace function public.auth_hotel_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select hotel_id from staff_users
  where id = auth.uid() and status = 'active'::staff_status
$$;

create or replace function public.auth_role()
returns staff_role
language sql stable security definer set search_path = public
as $$
  select role from staff_users
  where id = auth.uid() and status = 'active'::staff_status
$$;

create or replace function public.auth_department_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select department_id from staff_users
  where id = auth.uid() and status = 'active'::staff_status
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from staff_users
    where id = auth.uid()
      and status = 'active'::staff_status
      and role in ('hotel_admin'::staff_role, 'manager'::staff_role)
  )
$$;

create or replace function public.is_hotel_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from staff_users
    where id = auth.uid()
      and status = 'active'::staff_status
      and role = 'hotel_admin'::staff_role
  )
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

-- The active guest session for the caller, if any. Expiry and revocation are
-- enforced HERE, in the database — not trusted from the client.
create or replace function public.guest_session_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from guest_sessions
  where auth_user_id = auth.uid()
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
$$;

create or replace function public.guest_hotel_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select hotel_id from guest_sessions
  where auth_user_id = auth.uid()
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
$$;

create or replace function public.guest_room_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select room_id from guest_sessions
  where auth_user_id = auth.uid()
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
$$;
