CREATE TABLE IF NOT EXISTS academy.academy_claim_reminders (
  id TEXT PRIMARY KEY,
  academy_id TEXT NOT NULL REFERENCES academy.academies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  sent_by TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_claim_reminders_academy_idx ON academy.academy_claim_reminders (academy_id);
