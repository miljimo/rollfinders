CREATE OR REPLACE PROCEDURE "payoutRequestCreate"(
    p_id text,
    p_client_id text,
    p_payee_id text,
    p_amount_minor bigint,
    p_currency char(3),
    p_destination_account_id text,
    p_requested_by text,
    p_notes text
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
DECLARE
    v_balance record;
    v_remaining bigint;
    v_payment record;
    v_reserve_amount bigint;
BEGIN
    IF p_destination_account_id IS NULL OR btrim(p_destination_account_id) = '' THEN
        RAISE EXCEPTION 'payee_account_not_enabled';
    END IF;

    SELECT * INTO v_balance
    FROM "payeeBalanceGet"(p_payee_id, p_client_id, p_currency);

    IF p_amount_minor < v_balance.minimum_payout_amount OR p_amount_minor > v_balance.available_payout_amount THEN
        RAISE EXCEPTION 'payout_balance_unavailable';
    END IF;

    INSERT INTO payout_requests (
        id,
        client_id,
        payee_id,
        amount_minor,
        currency,
        status,
        destination_account_id,
        requested_by,
        notes
    )
    VALUES (
        p_id,
        p_client_id,
        p_payee_id,
        p_amount_minor,
        p_currency,
        'pending_review',
        p_destination_account_id,
        p_requested_by,
        p_notes
    );

    v_remaining := p_amount_minor;

    FOR v_payment IN
        SELECT
            p.id,
            p.amount_minor
                - p.refunded_amount_minor
                - COALESCE(NULLIF(p.metadata->>'platform_fee_amount', '')::bigint, NULLIF(p.metadata->>'stripe_application_fee_amount', '')::bigint, 0)
                - COALESCE((
                    SELECT SUM(pre.amount_minor)
                    FROM payout_request_entries pre
                    WHERE pre.payment_id = p.id
                      AND pre.status IN ('reserved', 'settled')
                ), 0) AS available_minor
        FROM payments p
        LEFT JOIN checkouts c ON c.payment_id = p.id
        WHERE p.status = 'succeeded'
          AND p.currency = p_currency
          AND (p.metadata->>'payee_id' = p_payee_id OR p.metadata->>'academy_id' = p_payee_id)
          AND (p_client_id IS NULL OR c.client_id = p_client_id OR p.metadata->>'client_id' = p_client_id)
        ORDER BY p.created_at ASC
    LOOP
        EXIT WHEN v_remaining <= 0;
        IF v_payment.available_minor <= 0 THEN
            CONTINUE;
        END IF;
        v_reserve_amount := LEAST(v_remaining, v_payment.available_minor);
        INSERT INTO payout_request_entries (
            id,
            payout_request_id,
            payment_id,
            amount_minor,
            currency,
            status
        )
        VALUES (
            'pre_' || replace(gen_random_uuid()::text, '-', ''),
            p_id,
            v_payment.id,
            v_reserve_amount,
            p_currency,
            'reserved'
        );
        v_remaining := v_remaining - v_reserve_amount;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'payout_balance_unavailable';
    END IF;

    INSERT INTO payout_request_status_history (payout_request_id, from_status, to_status, actor_id, notes)
    VALUES (p_id, NULL, 'pending_review', p_requested_by, p_notes);

    INSERT INTO payout_request_audit_events (id, payout_request_id, event_type, actor_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        p_id,
        'payout_request.created',
        p_requested_by,
        jsonb_build_object('amount', p_amount_minor, 'currency', p_currency, 'payee_id', p_payee_id)
    );

    INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        'payout_request.created',
        p_id,
        jsonb_build_object('payout_request_id', p_id, 'status', 'pending_review', 'amount', p_amount_minor, 'currency', p_currency, 'payee_id', p_payee_id)
    );
END;
$$;
