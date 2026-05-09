create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key,
  email text,
  agency_name text,
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  niche text not null,
  city text not null,
  radius integer,
  created_at timestamptz default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  place_id text not null unique,
  name text not null,
  address text not null,
  phone text,
  rating numeric,
  review_count integer,
  google_maps_url text,
  website_url text,
  website_status text not null default 'UNKNOWN',
  business_status text,
  created_at timestamptz default now()
);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  outcome text not null,
  notes text,
  follow_up_needed boolean default false,
  created_at timestamptz default now()
);

create table if not exists generated_scripts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  script_json jsonb not null,
  created_at timestamptz default now()
);

create table if not exists generated_emails (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  created_at timestamptz default now(),
  sent_at timestamptz
);

create table if not exists generated_sites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  site_spec_json jsonb not null,
  preview_slug text not null unique,
  status text not null default 'draft',
  created_at timestamptz default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  stage text not null default 'lead',
  setup_fee numeric default 0,
  monthly_fee numeric default 0,
  created_at timestamptz default now(),
  closed_at timestamptz
);

alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table businesses enable row level security;
alter table call_logs enable row level security;
alter table generated_scripts enable row level security;
alter table generated_emails enable row level security;
alter table generated_sites enable row level security;
alter table deals enable row level security;

create policy "profiles owner read" on profiles for select using (auth.uid() = id);
create policy "profiles owner update" on profiles for update using (auth.uid() = id);

create policy "campaigns owner all" on campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "businesses owner all" on businesses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "call_logs owner all" on call_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_scripts owner all" on generated_scripts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_emails owner all" on generated_emails for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_sites owner all" on generated_sites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "deals owner all" on deals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
