CREATE TABLE IF NOT EXISTS analytics.events (
    id text PRIMARY KEY,
    event_name text NOT NULL,
    visitor_id text,
    session_id text,
    ip_hash text,
    academy_id text,
    open_mat_id text,
    country_code text,
    country_name text,
    source text NOT NULL DEFAULT 'analytics_api',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at ON analytics.events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id_created_at ON analytics.events(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_academy_id_created_at ON analytics.events(academy_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_open_mat_id_created_at ON analytics.events(open_mat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country_code_created_at ON analytics.events(country_code, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics.events(created_at);
