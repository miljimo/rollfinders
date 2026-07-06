CREATE OR REPLACE FUNCTION academy.academyMemberRemove(
  academyId TEXT,
  userId TEXT
)
RETURNS TABLE (removed BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  DELETE FROM academy.academy_members
  WHERE academy_id = academyId AND user_id = userId;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN QUERY SELECT affected > 0;
END;
$$;
