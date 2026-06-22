CREATE OR REPLACE FUNCTION "payeeBalanceGet"(
    p_payee_id text,
    p_client_id text DEFAULT NULL,
    p_currency char(3) DEFAULT 'GBP'
)
RETURNS TABLE (
    payee_id text,
    client_id text,
    currency char(3),
    gross_paid_amount bigint,
    platform_fee_amount bigint,
    refunded_amount bigint,
    held_amount bigint,
    pending_payout_amount bigint,
    paid_payout_amount bigint,
    available_payout_amount bigint,
    minimum_payout_amount bigint,
    payout_destination_ready boolean
)
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    WITH eligible_payments AS (
        SELECT
            p.id,
            p.amount_minor,
            p.refunded_amount_minor,
            COALESCE(NULLIF(p.metadata->>'platform_fee_amount', '')::bigint, NULLIF(p.metadata->>'stripe_application_fee_amount', '')::bigint, 0) AS platform_fee_minor,
            p.metadata
        FROM payments p
        LEFT JOIN checkouts c ON c.payment_id = p.id
        WHERE p.status = 'succeeded'
          AND p.currency = COALESCE(p_currency, 'GBP')
          AND (p.metadata->>'payee_id' = p_payee_id OR p.metadata->>'academy_id' = p_payee_id)
          AND (p_client_id IS NULL OR c.client_id = p_client_id OR p.metadata->>'client_id' = p_client_id)
    ),
    payout_totals AS (
        SELECT
            COALESCE(SUM(CASE WHEN status IN ('pending_review', 'approved', 'held', 'processing') THEN amount_minor ELSE 0 END), 0) AS pending_amount,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_minor ELSE 0 END), 0) AS paid_amount,
            BOOL_OR(destination_account_id IS NOT NULL AND destination_account_id <> '') AS has_destination
        FROM payout_requests
        WHERE payee_id = p_payee_id
          AND currency = COALESCE(p_currency, 'GBP')
          AND (p_client_id IS NULL OR client_id = p_client_id)
    ),
    payment_totals AS (
        SELECT
            COALESCE(SUM(amount_minor), 0) AS gross_amount,
            COALESCE(SUM(platform_fee_minor), 0) AS platform_fee_amount,
            COALESCE(SUM(refunded_amount_minor), 0) AS refunded_amount,
            BOOL_OR(metadata->>'stripe_destination_account' IS NOT NULL OR metadata->>'destination_account_id' IS NOT NULL) AS has_destination
        FROM eligible_payments
    )
    SELECT
        p_payee_id,
        p_client_id,
        COALESCE(p_currency, 'GBP'),
        payment_totals.gross_amount,
        payment_totals.platform_fee_amount,
        payment_totals.refunded_amount,
        0::bigint,
        payout_totals.pending_amount,
        payout_totals.paid_amount,
        GREATEST(payment_totals.gross_amount - payment_totals.platform_fee_amount - payment_totals.refunded_amount - payout_totals.pending_amount - payout_totals.paid_amount, 0),
        100::bigint,
        COALESCE(payout_totals.has_destination, false) OR COALESCE(payment_totals.has_destination, false)
    FROM payment_totals, payout_totals;
$$;
