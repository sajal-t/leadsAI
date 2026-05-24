-- Auto-create profile row when a new auth user signs up (email or OAuth).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, agency_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'agency_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    agency_name = coalesce(excluded.agency_name, profiles.agency_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
