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
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_metric_date ON analytics.daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_metric_name_metric_date ON analytics.daily_metrics(metric_name, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_academy_id_metric_date ON analytics.daily_metrics(academy_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_open_mat_id_metric_date ON analytics.daily_metrics(open_mat_id, metric_date);
