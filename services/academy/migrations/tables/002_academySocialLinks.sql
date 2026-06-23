CREATE TABLE IF NOT EXISTS academy.academy_social_links (
  id TEXT PRIMARY KEY,
  academy_id TEXT NOT NULL REFERENCES academy.academies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academy_id, provider)
);
