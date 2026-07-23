\ir schema/001_analyticsSchema.sql
SET search_path TO analytics, public;
\ir schema/002_schemaMigrations.sql
\ir tables/001_visitors.sql
\ir tables/002_events.sql
\ir tables/003_dailyMetrics.sql
\ir tables/004_backfillDailyMetrics.sql
INSERT INTO analytics.schema_migrations(version) VALUES ('001_coreSchema') ON CONFLICT (version) DO NOTHING;
