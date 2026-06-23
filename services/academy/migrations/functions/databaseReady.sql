CREATE OR REPLACE FUNCTION academy.databaseReady()
RETURNS TABLE (ready BOOLEAN)
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'academy'
      AND table_name = 'academies'
  );
$$;
