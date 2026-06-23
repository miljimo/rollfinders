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

CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen_at ON analytics.visitors(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_session_id ON analytics.visitors(last_session_id);
