CREATE OR REPLACE FUNCTION academy.academyMemberListByUser(userId TEXT)
RETURNS SETOF academy.academy_members
LANGUAGE sql
STABLE
AS $$
  SELECT m.*
  FROM academy.academy_members m
  WHERE m.user_id = userId
  ORDER BY m.created_at ASC;
$$;
