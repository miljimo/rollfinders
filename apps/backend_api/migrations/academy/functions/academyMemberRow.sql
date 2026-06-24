CREATE OR REPLACE FUNCTION academy.academyMemberRow(memberId TEXT)
RETURNS TABLE (
  id TEXT,
  academy_id TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT m.id, m.academy_id, m.user_id, m.created_at, m.updated_at
  FROM academy.academy_members m
  WHERE m.id = memberId;
$$;
