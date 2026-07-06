CREATE OR REPLACE PROCEDURE "paymentInsert"(
    p_id text,
    p_amount_minor bigint,
    p_currency char(3),
    p_provider text,
    p_payment_method_type text,
    p_capture_method text,
    p_status text,
    p_external_reference text,
    p_metadata jsonb,
    p_provider_payment_id text,
    p_provider_raw_status text
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
BEGIN
    INSERT INTO payments (
        id,
        amount_minor,
        currency,
        provider,
        payment_method_type,
        capture_method,
        status,
        external_reference,
        metadata,
        provider_payment_id,
        provider_raw_status
    )
    VALUES (
        p_id,
        p_amount_minor,
        p_currency,
        p_provider,
        p_payment_method_type,
        p_capture_method,
        p_status,
        p_external_reference,
        COALESCE(p_metadata, '{}'::jsonb),
        p_provider_payment_id,
        p_provider_raw_status
    );

    INSERT INTO payment_status_history (payment_id, from_status, to_status, reason)
    VALUES (p_id, NULL, p_status, 'created');

    INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        'payment.status_changed',
        p_id,
        jsonb_build_object(
            'payment_id', p_id,
            'status', p_status,
            'amount', p_amount_minor,
            'currency', p_currency
        )
    );
END;
$$;
