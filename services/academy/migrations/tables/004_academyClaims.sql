CREATE TABLE IF NOT EXISTS academy.academy_claims (
  id TEXT PRIMARY KEY,
  academy_id TEXT NOT NULL REFERENCES academy.academies(id) ON DELETE CASCADE,
  claimant_user_id TEXT,
  claimant_email TEXT NOT NULL,
  status academy.academy_claim_status NOT NULL DEFAULT 'pending',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_claims_status_idx ON academy.academy_claims (status);
