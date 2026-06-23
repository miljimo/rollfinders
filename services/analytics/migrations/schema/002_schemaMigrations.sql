CREATE TABLE IF NOT EXISTS analytics.schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
