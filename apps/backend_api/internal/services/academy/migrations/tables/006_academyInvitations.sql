CREATE TABLE IF NOT EXISTS academy.academy_invitations (
  id TEXT PRIMARY KEY,
  academy_id TEXT NOT NULL REFERENCES academy.academies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by TEXT,
  token_hash TEXT NOT NULL,
  status academy.academy_invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_invitations_academy_idx ON academy.academy_invitations (academy_id);
CREATE INDEX IF NOT EXISTS academy_invitations_email_idx ON academy.academy_invitations (email);
