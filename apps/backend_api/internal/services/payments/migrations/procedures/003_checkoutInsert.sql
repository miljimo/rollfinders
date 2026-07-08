CREATE OR REPLACE PROCEDURE "checkoutInsert"(
    p_id text,
    p_client_id text,
    p_client_state text,
    p_payment_id text,
    p_resource_type text,
    p_resource_id text,
    p_resource_label text,
    p_amount_minor bigint,
    p_currency char(3),
    p_payer_user_id text,
    p_payer_email text,
    p_metadata jsonb,
    p_success_url text,
    p_cancel_url text,
    p_checkout_url text,
    p_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
DECLARE
    v_payment payments%ROWTYPE;
BEGIN
    INSERT INTO checkouts (
        id,
        client_id,
        client_state,
        payment_id,
        resource_type,
        resource_id,
        resource_label,
        amount_minor,
        currency,
        payer_user_id,
        payer_email,
        metadata,
        success_url,
        cancel_url,
        checkout_url,
        expires_at
    )
    VALUES (
        p_id,
        p_client_id,
        p_client_state,
        p_payment_id,
        p_resource_type,
        p_resource_id,
        p_resource_label,
        p_amount_minor,
        p_currency,
        p_payer_user_id,
        p_payer_email,
        COALESCE(p_metadata, '{}'::jsonb),
        p_success_url,
        p_cancel_url,
        p_checkout_url,
        p_expires_at
    );

    INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        'checkout.created',
        p_id,
        jsonb_build_object(
            'checkout_session_id', p_id,
            'client_id', p_client_id,
            'payment_id', p_payment_id,
            'resource_type', p_resource_type,
            'resource_id', p_resource_id,
            'amount', p_amount_minor,
            'currency', p_currency,
            'payer_email', p_payer_email
        )
    );

    SELECT * INTO v_payment
    FROM payments
    WHERE id = p_payment_id;

    IF v_payment.status = 'succeeded'
       AND p_resource_type = 'course_occurrence'
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
            jsonb_build_object(
                'payment_id', v_payment.id,
                'amount', v_payment.amount_minor,
                'currency', v_payment.currency,
                'provider', v_payment.provider,
                'provider_payment_id', v_payment.provider_payment_id,
                'provider_status', v_payment.provider_raw_status,
                'resource_type', p_resource_type,
                'resource_id', p_resource_id,
                'resource_label', p_resource_label,
                'checkout_session_id', p_id,
                'client_id', p_client_id,
                'client_state', p_client_state,
                'payer_user_id', p_payer_user_id,
                'payer_email', p_payer_email,
                'academy_id', v_payment.metadata->>'academy_id',
                'academy_owner_id', v_payment.metadata->>'academy_owner_id',
                'metadata', v_payment.metadata,
                'created_at', v_payment.created_at,
                'updated_at', v_payment.updated_at
            )
        );
    END IF;
END;
$$;
