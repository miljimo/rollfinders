CREATE OR REPLACE FUNCTION academy.academyMemberAdd(
  memberId TEXT,
  academyId TEXT,
  userId TEXT
)
RETURNS SETOF academy.academy_members
LANGUAGE plpgsql
AS $$
DECLARE
  existingId TEXT;
BEGIN
  SELECT id INTO existingId
  FROM academy.academy_members
  WHERE academy_id = academyId AND user_id = userId;

  IF existingId IS NULL THEN
    INSERT INTO academy.academy_members (id, academy_id, user_id)
    VALUES (memberId, academyId, userId)
    RETURNING id INTO existingId;
  END IF;

  RETURN QUERY SELECT * FROM academy.academy_members WHERE id = existingId;
END;
$$;
