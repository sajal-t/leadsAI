-- Track Google Places "find leads" runs for dashboard activity and analytics.
alter table campaigns add column if not exists last_places_search_at timestamptz;
