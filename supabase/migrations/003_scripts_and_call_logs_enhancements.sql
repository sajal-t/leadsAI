-- generated_scripts: versioning and angle
alter table generated_scripts add column if not exists angle text;
alter table generated_scripts add column if not exists version_number integer default 1;
alter table generated_scripts add column if not exists is_active boolean default true;

-- call_logs: richer metadata
alter table call_logs add column if not exists answered boolean;
alter table call_logs add column if not exists answered_by text;
alter table call_logs add column if not exists generate_email_requested boolean default false;
alter table call_logs add column if not exists generate_site_requested boolean default false;
alter table call_logs add column if not exists callback_at timestamptz;
alter table call_logs add column if not exists meeting_at timestamptz;
alter table call_logs add column if not exists contact_email text;
alter table call_logs add column if not exists interest_tags text[];
alter table call_logs add column if not exists metadata jsonb;
