CREATE OR REPLACE PROCEDURE "providerEventRecord"(
    p_provider text,
    p_provider_event_id text,
    p_payload jsonb
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
BEGIN
    INSERT INTO provider_events (provider, provider_event_id, payload)
    VALUES (p_provider, p_provider_event_id, COALESCE(p_payload, '{}'::jsonb))
    ON CONFLICT (provider, provider_event_id) DO NOTHING;
END;
$$;
