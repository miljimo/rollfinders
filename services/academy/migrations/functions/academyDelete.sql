CREATE OR REPLACE FUNCTION academy.academyDelete(academyId TEXT)
RETURNS SETOF academy.academies
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM academy.academies
  WHERE id = academyId
  RETURNING *;
END;
$$;
