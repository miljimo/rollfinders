ALTER TABLE wallet.wallet_ledger_entries
    DROP CONSTRAINT IF EXISTS wallet_ledger_entries_transaction_id_fkey;

DROP FUNCTION IF EXISTS wallet.transfer(text, text, text, text, text, text, bigint, text, text, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION wallet.transfer(
    p_transfer_id text,
    p_debit_statement_id text,
    p_credit_statement_id text,
    p_type text,
    p_source_wallet_id text,
    p_destination_wallet_id text,
    p_amount bigint,
    p_currency text,
    p_reference_type text,
    p_reference_id text,
    p_idempotency_key text,
    p_description text,
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
    source_wallet wallet.wallets%ROWTYPE;
    destination_wallet wallet.wallets%ROWTYPE;
    source_balance bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM wallet.wallet_ledger_entries l WHERE l.transaction_id = p_transfer_id) THEN
        RETURN QUERY
        SELECT p_transfer_id, 'TRANSFER', 'COMPLETED', p_amount, p_currency, p_source_wallet_id,
               p_destination_wallet_id, COALESCE(p_reference_type, ''), COALESCE(p_reference_id, ''),
               COALESCE(p_idempotency_key, ''), '', MIN(l.created_at)
        FROM wallet.wallet_ledger_entries l
        WHERE l.transaction_id = p_transfer_id
        GROUP BY l.transaction_id;
        RETURN;
    END IF;

    IF p_source_wallet_id = p_destination_wallet_id THEN
        RAISE EXCEPTION 'source and destination wallet IDs must be different';
    END IF;

    SELECT * INTO source_wallet FROM wallet.wallets w WHERE w.id = p_source_wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet not found';
    END IF;

    SELECT * INTO destination_wallet FROM wallet.wallets w WHERE w.id = p_destination_wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet not found';
    END IF;

    IF source_wallet.status = 'closed' OR destination_wallet.status = 'closed' THEN
        RAISE EXCEPTION 'wallet is read-only';
    END IF;
    IF source_wallet.status <> 'active' OR destination_wallet.status <> 'active' THEN
        RAISE EXCEPTION 'wallet is not active';
    END IF;
    IF source_wallet.currency <> destination_wallet.currency OR source_wallet.currency <> p_currency THEN
        RAISE EXCEPTION 'wallet currencies must match';
    END IF;

    source_balance := wallet.wallet_ledger_balance(source_wallet.id);
    IF source_balance < p_amount THEN
        RAISE EXCEPTION 'insufficient available balance';
    END IF;

    PERFORM wallet.create_statement(p_debit_statement_id, p_transfer_id, source_wallet.id, p_amount, 0, p_currency, p_description, p_created_at);
    PERFORM wallet.create_statement(p_credit_statement_id, p_transfer_id, destination_wallet.id, 0, p_amount, p_currency, p_description, p_created_at);

    RETURN QUERY
    SELECT p_transfer_id, 'TRANSFER', 'COMPLETED', p_amount, p_currency, source_wallet.id,
           destination_wallet.id, COALESCE(p_reference_type, ''), COALESCE(p_reference_id, ''),
           COALESCE(p_idempotency_key, ''), '', p_created_at;
END;
$$;
