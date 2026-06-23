CREATE TABLE IF NOT EXISTS academy.academy_audit_events (
  id TEXT PRIMARY KEY,
  academy_id TEXT,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_audit_events_academy_idx ON academy.academy_audit_events (academy_id);
