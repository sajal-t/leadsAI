-- Lead discovery v2: multi-source pipeline, jobs, caching, API usage (Google optional)

-- Normalize legacy website_status values to new vocabulary
update businesses set website_status = 'none' where website_status = 'NO_WEBSITE_FOUND';
update businesses set website_status = 'good' where website_status = 'WEBSITE_FOUND';

alter table businesses
  add column if not exists category text,
  add column if not exists email text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists has_real_website boolean,
  add column if not exists website_quality_score integer not null default 0,
  add column if not exists lead_score integer not null default 0,
  add column if not exists lead_reason text,
  add column if not exists discovery_source text,
  add column if not exists source_url text,
  add column if not exists raw_data jsonb,
  add column if not exists updated_at timestamptz default now();

comment on column businesses.discovery_source is 'Primary provider key, e.g. openstreetmap, brave_serp, directory_serp, google_places_verify';

alter table campaigns
  add column if not exists last_discovery_at timestamptz;

create table if not exists lead_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  source_name text not null,
  source_url text,
  raw_data jsonb,
  confidence numeric default 1,
  created_at timestamptz default now()
);

create table if not exists lead_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'queued',
  job_type text not null,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists lead_discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'queued',
  stage text not null default 'queued',
  progress integer not null default 0,
  leads_found integer not null default 0,
  leads_enriched integer not null default 0,
  leads_no_website integer not null default 0,
  error text,
  meta jsonb default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists lead_discovery_jobs_campaign_idx on lead_discovery_jobs (campaign_id, created_at desc);

create table if not exists search_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  discovery_job_id uuid references lead_discovery_jobs(id) on delete set null,
  query text not null,
  location text,
  category text,
  status text not null default 'ok',
  results_count integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists search_queries_user_idx on search_queries (user_id, created_at desc);

create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  provider text not null,
  action text not null,
  estimated_cost numeric not null default 0,
  credits_used integer not null default 0,
  meta jsonb,
  created_at timestamptz default now()
);

create index if not exists api_usage_user_day_idx on api_usage (user_id, created_at desc);

create table if not exists discovery_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists discovery_cache_expires_idx on discovery_cache (expires_at);

alter table lead_sources enable row level security;
alter table lead_enrichment_jobs enable row level security;
alter table lead_discovery_jobs enable row level security;
alter table search_queries enable row level security;
alter table api_usage enable row level security;

create policy "lead_sources owner all" on lead_sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lead_enrichment_jobs owner all" on lead_enrichment_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lead_discovery_jobs owner all" on lead_discovery_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "search_queries owner all" on search_queries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "api_usage owner read" on api_usage for select using (auth.uid() = user_id);
create policy "api_usage owner insert" on api_usage for insert with check (auth.uid() = user_id);

alter table discovery_cache enable row level security;
