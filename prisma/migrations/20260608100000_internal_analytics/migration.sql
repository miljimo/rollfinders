CREATE TABLE "analytics_visitors" (
  "visitor_id" TEXT NOT NULL,
  "last_session_id" TEXT,
  "ip_hash" TEXT,
  "user_agent_hash" TEXT,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "session_seen_at" TIMESTAMP(3),
  "metadata" JSONB,

  CONSTRAINT "analytics_visitors_pkey" PRIMARY KEY ("visitor_id")
);

CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "visitor_id" TEXT,
  "session_id" TEXT,
  "ip_hash" TEXT,
  "academy_id" TEXT,
  "open_mat_id" TEXT,
  "source" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_daily_metrics" (
  "id" TEXT NOT NULL,
  "metric_date" DATE NOT NULL,
  "metric_name" TEXT NOT NULL,
  "source" TEXT,
  "academy_id" TEXT,
  "open_mat_id" TEXT,
  "dimension_key" TEXT NOT NULL DEFAULT 'global',
  "dimensions" JSONB,
  "value" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analytics_daily_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_visitors_last_seen_at_idx" ON "analytics_visitors"("last_seen_at");
CREATE INDEX "analytics_visitors_last_session_id_idx" ON "analytics_visitors"("last_session_id");

CREATE INDEX "analytics_events_event_name_created_at_idx" ON "analytics_events"("event_name", "created_at");
CREATE INDEX "analytics_events_visitor_id_created_at_idx" ON "analytics_events"("visitor_id", "created_at");
CREATE INDEX "analytics_events_academy_id_created_at_idx" ON "analytics_events"("academy_id", "created_at");
CREATE INDEX "analytics_events_open_mat_id_created_at_idx" ON "analytics_events"("open_mat_id", "created_at");
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");

CREATE UNIQUE INDEX "analytics_daily_metrics_metric_date_metric_name_dimension_key_key"
ON "analytics_daily_metrics"("metric_date", "metric_name", "dimension_key");
CREATE INDEX "analytics_daily_metrics_metric_date_idx" ON "analytics_daily_metrics"("metric_date");
CREATE INDEX "analytics_daily_metrics_metric_name_metric_date_idx" ON "analytics_daily_metrics"("metric_name", "metric_date");
CREATE INDEX "analytics_daily_metrics_academy_id_metric_date_idx" ON "analytics_daily_metrics"("academy_id", "metric_date");
CREATE INDEX "analytics_daily_metrics_open_mat_id_metric_date_idx" ON "analytics_daily_metrics"("open_mat_id", "metric_date");

ALTER TABLE "analytics_events"
ADD CONSTRAINT "analytics_events_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "analytics_visitors"("visitor_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analytics_events"
ADD CONSTRAINT "analytics_events_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analytics_events"
ADD CONSTRAINT "analytics_events_open_mat_id_fkey" FOREIGN KEY ("open_mat_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analytics_daily_metrics"
ADD CONSTRAINT "analytics_daily_metrics_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analytics_daily_metrics"
ADD CONSTRAINT "analytics_daily_metrics_open_mat_id_fkey" FOREIGN KEY ("open_mat_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
