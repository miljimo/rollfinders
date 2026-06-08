ALTER TABLE analytics_events
  ADD COLUMN country_code TEXT,
  ADD COLUMN country_name TEXT;

CREATE INDEX analytics_events_country_code_created_at_idx
  ON analytics_events(country_code, created_at);
