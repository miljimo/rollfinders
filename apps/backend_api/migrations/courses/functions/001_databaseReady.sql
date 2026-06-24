CREATE OR REPLACE FUNCTION "databaseReady"()
RETURNS TABLE(status text)
LANGUAGE sql
SET search_path = courses, public
AS $$
    SELECT 'ready'::text AS status;
$$;
