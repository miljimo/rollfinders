CREATE TABLE IF NOT EXISTS academy.academy_verifications (
  id TEXT PRIMARY KEY,
  academy_id TEXT NOT NULL REFERENCES academy.academies(id) ON DELETE CASCADE,
  status academy.academy_verification_status NOT NULL DEFAULT 'submitted',
  submitted_by TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
