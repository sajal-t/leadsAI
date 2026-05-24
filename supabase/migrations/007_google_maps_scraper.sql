-- Google Maps scraper as sole lead discovery source

comment on column businesses.discovery_source is 'Primary provider key, e.g. google_maps_scraper';

alter table businesses
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

alter table businesses
  alter column discovery_source set default 'google_maps_scraper';

alter table lead_discovery_jobs
  add column if not exists query text,
  add column if not exists niche text,
  add column if not exists city text,
  add column if not exists source text default 'google_maps_scraper';
