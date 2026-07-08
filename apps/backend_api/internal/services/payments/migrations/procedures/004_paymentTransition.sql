CREATE OR REPLACE PROCEDURE "paymentTransition"(
    p_payment_id text,
    p_next_status text,
    p_reason text DEFAULT NULL
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
DECLARE
    v_previous_status text;
    v_course_payload jsonb;
BEGIN
    SELECT status
    INTO v_previous_status
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF v_previous_status IS NULL THEN
        RAISE EXCEPTION 'payment_not_found: %', p_payment_id USING ERRCODE = 'P0002';
    END IF;

    UPDATE payments
    SET status = p_next_status,
        updated_at = now()
    WHERE id = p_payment_id;

    INSERT INTO payment_status_history (payment_id, from_status, to_status, reason)
    VALUES (p_payment_id, v_previous_status, p_next_status, p_reason);

    INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        'payment.status_changed',
        p_payment_id,
        jsonb_build_object(
            'payment_id', p_payment_id,
            'from_status', v_previous_status,
            'status', p_next_status
        )
    );

    IF p_next_status = 'succeeded' THEN
        SELECT jsonb_build_object(
            'payment_id', p.id,
            'amount', p.amount_minor,
            'currency', p.currency,
            'provider', p.provider,
            'provider_payment_id', p.provider_payment_id,
            'provider_status', p.provider_raw_status,
            'resource_type', c.resource_type,
            'resource_id', c.resource_id,
            'resource_label', c.resource_label,
            'checkout_session_id', c.id,
            'client_id', c.client_id,
            'client_state', c.client_state,
            'payer_user_id', c.payer_user_id,
            'payer_email', c.payer_email,
            'academy_id', p.metadata->>'academy_id',
            'academy_owner_id', p.metadata->>'academy_owner_id',
            'metadata', p.metadata,
            'created_at', p.created_at,
            'updated_at', p.updated_at
        )
        INTO v_course_payload
        FROM payments p
        JOIN checkouts c ON c.payment_id = p.id
        WHERE p.id = p_payment_id
          AND c.resource_type = 'course_occurrence'
        LIMIT 1;

        IF v_course_payload IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM outbox_events
               WHERE event_type = 'payment.succeeded'
                 AND aggregate_id = p_payment_id
           ) THEN
            INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
            VALUES (
                'evt_' || replace(gen_random_uuid()::text, '-', ''),
                'payment.succeeded',
                p_payment_id,
                v_course_payload
            );
        END IF;
    END IF;
END;
$$;
