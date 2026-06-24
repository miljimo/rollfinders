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
END;
$$;
