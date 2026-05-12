-- AI Website Studio: projects, files, chat messages; link to generated_sites

create table if not exists ai_site_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null default 'Business Website Preview',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id)
);

create table if not exists ai_site_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ai_site_projects(id) on delete cascade,
  path text not null,
  language text not null,
  content text not null,
  updated_at timestamptz default now(),
  unique (project_id, path)
);

create table if not exists ai_site_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ai_site_projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists ai_site_files_project_id_idx on ai_site_files (project_id);
create index if not exists ai_site_messages_project_id_idx on ai_site_messages (project_id);

alter table generated_sites add column if not exists ai_site_project_id uuid references ai_site_projects(id) on delete set null;
create index if not exists generated_sites_ai_site_project_id_idx on generated_sites (ai_site_project_id);
create unique index if not exists generated_sites_one_studio_project on generated_sites (ai_site_project_id) where ai_site_project_id is not null;

alter table ai_site_projects enable row level security;
alter table ai_site_files enable row level security;
alter table ai_site_messages enable row level security;

create policy "ai_site_projects owner all" on ai_site_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_site_files owner via project" on ai_site_files for all using (
  exists (select 1 from ai_site_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from ai_site_projects p where p.id = project_id and p.user_id = auth.uid())
);
create policy "ai_site_messages owner via project" on ai_site_messages for all using (
  exists (select 1 from ai_site_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from ai_site_projects p where p.id = project_id and p.user_id = auth.uid())
);
