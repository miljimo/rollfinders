CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.visitors (
    visitor_id text PRIMARY KEY,
    last_session_id text,
    ip_hash text,
    user_agent_hash text,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    session_seen_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

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

CREATE TABLE IF NOT EXISTS analytics.daily_metrics (
    id text PRIMARY KEY,
    metric_date date NOT NULL,
    metric_name text NOT NULL,
    source text,
    academy_id text,
    open_mat_id text,
    dimension_key text NOT NULL DEFAULT 'global',
    dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
    value integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_analytics_daily_metrics_metric_date_name_dimension ON analytics.daily_metrics(metric_date, metric_name, dimension_key);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen_at ON analytics.visitors(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_session_id ON analytics.visitors(last_session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at ON analytics.events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id_created_at ON analytics.events(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_academy_id_created_at ON analytics.events(academy_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_open_mat_id_created_at ON analytics.events(open_mat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country_code_created_at ON analytics.events(country_code, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics.events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_metric_date ON analytics.daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_metric_name_metric_date ON analytics.daily_metrics(metric_name, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_academy_id_metric_date ON analytics.daily_metrics(academy_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_open_mat_id_metric_date ON analytics.daily_metrics(open_mat_id, metric_date);

DO $$
BEGIN
    IF to_regclass('public.analytics_visitors') IS NOT NULL THEN
        INSERT INTO analytics.visitors (
            visitor_id, last_session_id, ip_hash, user_agent_hash, first_seen_at, last_seen_at, session_seen_at, metadata
        )
        SELECT visitor_id, last_session_id, ip_hash, user_agent_hash, first_seen_at, last_seen_at, session_seen_at, COALESCE(metadata, '{}'::jsonb)
        FROM public.analytics_visitors
        ON CONFLICT (visitor_id) DO UPDATE SET
            last_session_id = EXCLUDED.last_session_id,
            ip_hash = COALESCE(analytics.visitors.ip_hash, EXCLUDED.ip_hash),
            user_agent_hash = COALESCE(analytics.visitors.user_agent_hash, EXCLUDED.user_agent_hash),
            first_seen_at = LEAST(analytics.visitors.first_seen_at, EXCLUDED.first_seen_at),
            last_seen_at = GREATEST(analytics.visitors.last_seen_at, EXCLUDED.last_seen_at),
            session_seen_at = EXCLUDED.session_seen_at,
            metadata = EXCLUDED.metadata;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.analytics_events') IS NOT NULL THEN
        INSERT INTO analytics.events (
            id, event_name, visitor_id, session_id, ip_hash, academy_id, open_mat_id, country_code, country_name, source, metadata, created_at
        )
        SELECT id, event_name, visitor_id, session_id, ip_hash, academy_id, open_mat_id, country_code, country_name, source, COALESCE(metadata, '{}'::jsonb), created_at
        FROM public.analytics_events
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.analytics_daily_metrics') IS NOT NULL THEN
        INSERT INTO analytics.daily_metrics (
            id, metric_date, metric_name, source, academy_id, open_mat_id, dimension_key, dimensions, value, created_at, updated_at
        )
        SELECT id, metric_date, metric_name, source, academy_id, open_mat_id, dimension_key, COALESCE(dimensions, '{}'::jsonb), value, created_at, updated_at
        FROM public.analytics_daily_metrics
        ON CONFLICT (metric_date, metric_name, dimension_key) DO UPDATE SET
            value = EXCLUDED.value,
            dimensions = EXCLUDED.dimensions,
            updated_at = EXCLUDED.updated_at;
    END IF;
END $$;

DROP TABLE IF EXISTS public.analytics_daily_metrics;
DROP TABLE IF EXISTS public.analytics_events;
DROP TABLE IF EXISTS public.analytics_visitors;
