CREATE OR REPLACE PROCEDURE "refundInsert"(
    p_id text,
    p_payment_id text,
    p_amount_minor bigint,
    p_currency char(3),
    p_status text,
    p_reason text,
    p_provider_refund_id text
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
DECLARE
    v_payment_amount bigint;
    v_refunded_amount bigint;
    v_next_payment_status text;
BEGIN
    SELECT amount_minor, refunded_amount_minor
    INTO v_payment_amount, v_refunded_amount
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF v_payment_amount IS NULL THEN
        RAISE EXCEPTION 'payment_not_found: %', p_payment_id USING ERRCODE = 'P0002';
    END IF;

    IF p_status = 'succeeded' AND v_refunded_amount + p_amount_minor > v_payment_amount THEN
        RAISE EXCEPTION 'refund_exceeds_available_amount: %', p_payment_id USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO refunds (
        id,
        payment_id,
        amount_minor,
        currency,
        status,
        reason,
        provider_refund_id
    )
    VALUES (
        p_id,
        p_payment_id,
        p_amount_minor,
        p_currency,
        p_status,
        p_reason,
        p_provider_refund_id
    );

    IF p_status = 'succeeded' THEN
        IF v_refunded_amount + p_amount_minor = v_payment_amount THEN
            v_next_payment_status := 'refunded';
        ELSE
            v_next_payment_status := 'partially_refunded';
        END IF;

        UPDATE payments
        SET refunded_amount_minor = v_refunded_amount + p_amount_minor,
            status = v_next_payment_status,
            updated_at = now()
        WHERE id = p_payment_id;

        INSERT INTO payment_status_history (payment_id, from_status, to_status, reason)
        VALUES (p_payment_id, NULL, v_next_payment_status, p_reason);

        INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
        VALUES (
            'evt_' || replace(gen_random_uuid()::text, '-', ''),
            'payment.status_changed',
            p_payment_id,
            jsonb_build_object(
                'payment_id', p_payment_id,
                'status', v_next_payment_status,
                'amount', v_payment_amount,
                'currency', p_currency
            )
        );
    END IF;

    INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        'refund.status_changed',
        p_id,
        jsonb_build_object(
            'refund_id', p_id,
            'payment_id', p_payment_id,
            'status', p_status,
            'amount', p_amount_minor,
            'currency', p_currency
        )
    );
END;
$$;
