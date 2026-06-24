CREATE OR REPLACE FUNCTION booking.databaseReady()
RETURNS TABLE(status text)
LANGUAGE sql
AS $$
    SELECT 'ready'::text AS status;
$$;
