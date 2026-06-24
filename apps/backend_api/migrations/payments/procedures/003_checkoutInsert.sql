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
END;
$$;
