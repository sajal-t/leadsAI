-- Fix "Database error saving new user" on email signup.
-- Run this in Supabase → SQL Editor if manual signup fails.

alter table public.profiles add column if not exists full_name text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, agency_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      null
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'agency_name'), ''),
      'Your agency'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    agency_name = coalesce(excluded.agency_name, public.profiles.agency_name);
  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auth signup runs as supabase_auth_admin; RLS blocks insert without a policy.
drop policy if exists "profiles_auth_admin_insert" on public.profiles;
create policy "profiles_auth_admin_insert"
  on public.profiles
  for insert
  to supabase_auth_admin
  with check (true);

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

grant usage on schema public to supabase_auth_admin;
grant insert, update on table public.profiles to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;
