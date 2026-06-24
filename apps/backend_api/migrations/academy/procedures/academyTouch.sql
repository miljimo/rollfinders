CREATE OR REPLACE PROCEDURE academy.academyTouch(academyId TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE academy.academies
  SET updated_at = now()
  WHERE id = academyId;
END;
$$;
