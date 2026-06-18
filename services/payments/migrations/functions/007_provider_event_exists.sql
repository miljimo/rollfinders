CREATE OR REPLACE FUNCTION provider_event_exists(
    p_provider text,
    p_provider_event_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM provider_events
        WHERE provider = p_provider
          AND provider_event_id = p_provider_event_id
    );
$$;
