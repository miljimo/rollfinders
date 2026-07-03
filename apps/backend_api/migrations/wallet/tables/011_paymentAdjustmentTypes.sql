CREATE OR REPLACE FUNCTION wallet.adjust(
    p_transaction_id text,
    p_debit_statement_id text,
    p_credit_statement_id text,
    p_type text,
    p_wallet_id text,
    p_counter_wallet_id text,
    p_amount bigint,
    p_currency text,
    p_reference text,
    p_idempotency_key text,
    p_reason text,
    p_created_at timestamptz
)
RETURNS TABLE (
    id text,
    type text,
    status text,
    amount bigint,
    currency text,
    source_wallet_id text,
    destination_wallet_id text,
    reference_type text,
    reference_id text,
    idempotency_key text,
    original_transaction_id text,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    target wallet.wallets%ROWTYPE;
    counter wallet.wallets%ROWTYPE;
    source_id text;
    destination_id text;
BEGIN
    RETURN QUERY SELECT * FROM wallet.replay_transaction(p_idempotency_key);
    IF FOUND THEN
        RETURN;
    END IF;

    IF p_type NOT IN ('MANUAL_CREDIT', 'MANUAL_DEBIT', 'SYSTEM_ADJUSTMENT', 'BOOKING_PAYMENT', 'COMMISSION') THEN
        p_type := 'SYSTEM_ADJUSTMENT';
    END IF;

    SELECT * INTO target FROM wallet.wallets w WHERE w.id = p_wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet not found';
    END IF;
    SELECT * INTO counter FROM wallet.wallets w WHERE w.id = p_counter_wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet not found';
    END IF;

    IF target.status = 'closed' OR counter.status = 'closed' THEN
        RAISE EXCEPTION 'wallet is read-only';
    END IF;
    IF target.status <> 'active' OR counter.status <> 'active' THEN
        RAISE EXCEPTION 'wallet is not active';
    END IF;
    IF target.currency <> counter.currency OR target.currency <> p_currency THEN
        RAISE EXCEPTION 'wallet currencies must match';
    END IF;

    source_id := counter.id;
    destination_id := target.id;
    IF p_type = 'MANUAL_DEBIT' OR p_type = 'COMMISSION' THEN
        source_id := target.id;
        destination_id := counter.id;
        IF wallet.wallet_ledger_balance(target.id) < p_amount THEN
            RAISE EXCEPTION 'insufficient available balance';
        END IF;
    END IF;

    RETURN QUERY
    SELECT * FROM wallet.create_double_entry(p_transaction_id, p_debit_statement_id, p_credit_statement_id, p_type, source_id, destination_id, p_amount, target.currency, 'wallet_adjustment', p_reference, p_idempotency_key, p_reason, '', p_created_at);
END;
$$;
