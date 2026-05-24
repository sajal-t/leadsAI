-- Personal name for greetings (separate from agency_name).

alter table profiles add column if not exists full_name text;

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
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '')
    ),
    coalesce(
      new.raw_user_meta_data->>'agency_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    agency_name = coalesce(excluded.agency_name, profiles.agency_name);
  return new;
end;
$$;
