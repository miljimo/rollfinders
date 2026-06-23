CREATE OR REPLACE FUNCTION academy.academyMemberList(academyId TEXT)
RETURNS SETOF academy.academy_members
LANGUAGE sql
STABLE
AS $$
  SELECT m.*
  FROM academy.academy_members m
  WHERE m.academy_id = academyId
  ORDER BY m.created_at DESC;
$$;
