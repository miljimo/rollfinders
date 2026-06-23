CREATE OR REPLACE FUNCTION academy.academyGet(academyId TEXT)
RETURNS SETOF academy.academies
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM academy.academies WHERE id = academyId;
$$;
