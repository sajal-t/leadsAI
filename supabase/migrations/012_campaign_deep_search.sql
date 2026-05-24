-- Deep search toggle per campaign (multi-query scrape vs single quick search)

alter table campaigns add column if not exists deep_search boolean not null default false;
alter table campaigns add column if not exists search_mode text default 'shallow';
