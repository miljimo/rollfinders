CREATE TABLE IF NOT EXISTS academy.academy_members (
  id TEXT PRIMARY KEY,
  academy_id TEXT NOT NULL REFERENCES academy.academies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academy_id, user_id)
);

CREATE INDEX IF NOT EXISTS academy_members_user_idx ON academy.academy_members (user_id);
