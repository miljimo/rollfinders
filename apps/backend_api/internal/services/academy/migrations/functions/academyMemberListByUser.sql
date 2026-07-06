CREATE OR REPLACE FUNCTION academy.academyMemberListByUser(userId TEXT, resultLimit INTEGER DEFAULT 10, resultOffset INTEGER DEFAULT 0)
RETURNS SETOF academy.academy_members
LANGUAGE sql
STABLE
AS $$
  SELECT m.*
  FROM academy.academy_members m
  WHERE m.user_id = userId
  ORDER BY m.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(resultLimit, 10), 1), 100)
  OFFSET GREATEST(COALESCE(resultOffset, 0), 0);
$$;
