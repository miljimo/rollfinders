CREATE OR REPLACE FUNCTION wallet.wallet_ledger_balance(p_wallet_id text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(credit_amount - debit_amount), 0)::bigint
    FROM wallet.wallet_ledger_entries
    WHERE wallet_id = p_wallet_id;
$$;

CREATE OR REPLACE FUNCTION wallet.get_wallet(p_id text)
RETURNS TABLE (
    id text,
    wallet_type text,
    owner_id text,
    currency text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    SELECT w.id, w.wallet_type, w.owner_id, w.currency, w.status, w.created_at, w.updated_at
    FROM wallet.wallets w
    WHERE w.id = p_id;
$$;

CREATE OR REPLACE FUNCTION wallet.create_wallet(
    p_id text,
    p_wallet_type text,
    p_owner_id text,
    p_currency text,
    p_status text,
    p_created_at timestamptz,
    p_updated_at timestamptz
)
RETURNS TABLE (
    id text,
    wallet_type text,
    owner_id text,
    currency text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO wallet.wallets (id, wallet_type, owner_id, currency, status, created_at, updated_at)
    VALUES (p_id, p_wallet_type, p_owner_id, p_currency, p_status, p_created_at, p_updated_at);

    RETURN QUERY SELECT * FROM wallet.get_wallet(p_id);
END;
$$;

CREATE OR REPLACE FUNCTION wallet.list_wallets(
    p_owner_id text,
    p_wallet_type text,
    p_currency text,
    p_limit integer,
    p_offset integer
)
RETURNS TABLE (
    id text,
    wallet_type text,
    owner_id text,
    currency text,
    status text,
    created_at timestamptz,
    updated_at timestamptz,
    total_count bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT w.id, w.wallet_type, w.owner_id, w.currency, w.status, w.created_at, w.updated_at, count(*) OVER()::bigint
    FROM wallet.wallets w
    WHERE (COALESCE(p_owner_id, '') = '' OR w.owner_id = p_owner_id)
      AND (COALESCE(p_wallet_type, '') = '' OR w.wallet_type = p_wallet_type)
      AND (COALESCE(p_currency, '') = '' OR w.currency = p_currency)
    ORDER BY w.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION wallet.get_balance(p_wallet_id text)
RETURNS TABLE (
    wallet_id text,
    currency text,
    available_balance bigint,
    reserved_balance bigint,
    balance bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT w.id, w.currency, wallet.wallet_ledger_balance(w.id), 0::bigint, wallet.wallet_ledger_balance(w.id)
    FROM wallet.wallets w
    WHERE w.id = p_wallet_id;
$$;

CREATE OR REPLACE FUNCTION wallet.list_wallet_transactions(p_wallet_id text)
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
LANGUAGE sql
STABLE
AS $$
    SELECT DISTINCT t.id, t.type, t.status, t.amount, t.currency,
           COALESCE(t.source_wallet_id, ''), COALESCE(t.destination_wallet_id, ''),
           COALESCE(t.reference_type, ''), COALESCE(t.reference_id, ''),
           COALESCE(t.idempotency_key, ''), COALESCE(t.original_transaction_id, ''), t.created_at
    FROM wallet.wallet_transactions t
    JOIN wallet.wallet_ledger_entries l ON l.transaction_id = t.id
    WHERE l.wallet_id = p_wallet_id
    ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION wallet.get_transaction(p_id text)
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
LANGUAGE sql
STABLE
AS $$
    SELECT t.id, t.type, t.status, t.amount, t.currency,
           COALESCE(t.source_wallet_id, ''), COALESCE(t.destination_wallet_id, ''),
           COALESCE(t.reference_type, ''), COALESCE(t.reference_id, ''),
           COALESCE(t.idempotency_key, ''), COALESCE(t.original_transaction_id, ''), t.created_at
    FROM wallet.wallet_transactions t
    WHERE t.id = p_id;
$$;

CREATE OR REPLACE FUNCTION wallet.get_transaction_statements(p_transaction_id text)
RETURNS TABLE (
    id text,
    transaction_id text,
    wallet_id text,
    debit_amount bigint,
    credit_amount bigint,
    currency text,
    description text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    SELECT l.id, l.transaction_id, l.wallet_id, l.debit_amount, l.credit_amount, l.currency,
           COALESCE(l.description, ''), l.created_at
    FROM wallet.wallet_ledger_entries l
    WHERE l.transaction_id = p_transaction_id
    ORDER BY l.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION wallet.create_transaction(
    p_id text,
    p_type text,
    p_status text,
    p_amount bigint,
    p_currency text,
    p_source_wallet_id text,
    p_destination_wallet_id text,
    p_reference_type text,
    p_reference_id text,
    p_idempotency_key text,
    p_original_transaction_id text,
    p_created_at timestamptz
)
RETURNS void
LANGUAGE sql
AS $$
    INSERT INTO wallet.wallet_transactions (id, type, status, amount, currency, source_wallet_id, destination_wallet_id, reference_type, reference_id, idempotency_key, original_transaction_id, created_at)
    VALUES (p_id, p_type, p_status, p_amount, p_currency, NULLIF(p_source_wallet_id, ''), NULLIF(p_destination_wallet_id, ''), NULLIF(p_reference_type, ''), NULLIF(p_reference_id, ''), NULLIF(p_idempotency_key, ''), NULLIF(p_original_transaction_id, ''), p_created_at);
$$;

CREATE OR REPLACE FUNCTION wallet.create_statement(
    p_id text,
    p_transaction_id text,
    p_wallet_id text,
    p_debit_amount bigint,
    p_credit_amount bigint,
    p_currency text,
    p_description text,
    p_created_at timestamptz
)
RETURNS void
LANGUAGE sql
AS $$
    INSERT INTO wallet.wallet_ledger_entries (id, transaction_id, wallet_id, debit_amount, credit_amount, currency, description, created_at)
    VALUES (p_id, p_transaction_id, p_wallet_id, p_debit_amount, p_credit_amount, p_currency, NULLIF(p_description, ''), p_created_at);
$$;

CREATE OR REPLACE FUNCTION wallet.replay_transaction(p_idempotency_key text)
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
LANGUAGE sql
STABLE
AS $$
    SELECT gt.*
    FROM wallet.wallet_transactions t
    CROSS JOIN LATERAL wallet.get_transaction(t.id) gt
    WHERE t.idempotency_key = p_idempotency_key;
$$;

CREATE OR REPLACE FUNCTION wallet.create_double_entry(
    p_transaction_id text,
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
    p_original_transaction_id text,
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
BEGIN
    PERFORM wallet.create_transaction(p_transaction_id, p_type, 'COMPLETED', p_amount, p_currency, p_source_wallet_id, p_destination_wallet_id, p_reference_type, p_reference_id, p_idempotency_key, p_original_transaction_id, p_created_at);
    PERFORM wallet.create_statement(p_debit_statement_id, p_transaction_id, p_source_wallet_id, p_amount, 0, p_currency, p_description, p_created_at);
    PERFORM wallet.create_statement(p_credit_statement_id, p_transaction_id, p_destination_wallet_id, 0, p_amount, p_currency, p_description, p_created_at);

    RETURN QUERY SELECT * FROM wallet.get_transaction(p_transaction_id);
END;
$$;

CREATE OR REPLACE FUNCTION wallet.transfer(
    p_transaction_id text,
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
    RETURN QUERY SELECT * FROM wallet.replay_transaction(p_idempotency_key);
    IF FOUND THEN
        RETURN;
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

    RETURN QUERY
    SELECT * FROM wallet.create_double_entry(p_transaction_id, p_debit_statement_id, p_credit_statement_id, p_type, source_wallet.id, destination_wallet.id, p_amount, p_currency, p_reference_type, p_reference_id, p_idempotency_key, p_description, '', p_created_at);
END;
$$;

CREATE OR REPLACE FUNCTION wallet.reverse_transaction(
    p_reversal_id text,
    p_idempotency_key text,
    p_transaction_id text,
    p_reference_type text,
    p_reference_id text,
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
    original wallet.wallet_transactions%ROWTYPE;
    entry record;
BEGIN
    RETURN QUERY SELECT * FROM wallet.replay_transaction(p_idempotency_key);
    IF FOUND THEN
        RETURN;
    END IF;

    SELECT * INTO original FROM wallet.wallet_transactions t WHERE t.id = p_transaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'transaction not found';
    END IF;
    IF original.status = 'REVERSED' THEN
        RAISE EXCEPTION 'transaction has already been reversed';
    END IF;
    IF EXISTS (SELECT 1 FROM wallet.wallet_transactions t WHERE t.original_transaction_id = original.id) THEN
        RAISE EXCEPTION 'transaction has already been reversed';
    END IF;

    PERFORM wallet.create_transaction(p_reversal_id, 'REVERSAL', 'COMPLETED', original.amount, original.currency, COALESCE(original.destination_wallet_id, ''), COALESCE(original.source_wallet_id, ''), p_reference_type, p_reference_id, p_idempotency_key, original.id, p_created_at);

    FOR entry IN SELECT * FROM wallet.wallet_ledger_entries WHERE transaction_id = original.id LOOP
        PERFORM wallet.create_statement(
            'led_' || md5(random()::text || clock_timestamp()::text),
            p_reversal_id,
            entry.wallet_id,
            entry.credit_amount,
            entry.debit_amount,
            entry.currency,
            p_description,
            p_created_at
        );
    END LOOP;

    UPDATE wallet.wallet_transactions SET status = 'REVERSED' WHERE wallet_transactions.id = original.id;

    RETURN QUERY SELECT * FROM wallet.get_transaction(p_reversal_id);
END;
$$;

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

    IF p_type NOT IN ('MANUAL_CREDIT', 'MANUAL_DEBIT', 'SYSTEM_ADJUSTMENT') THEN
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
    IF p_type = 'MANUAL_DEBIT' THEN
        source_id := target.id;
        destination_id := counter.id;
        IF wallet.wallet_ledger_balance(target.id) < p_amount THEN
            RAISE EXCEPTION 'insufficient available balance';
        END IF;
    END IF;

    RETURN QUERY
    SELECT * FROM wallet.create_double_entry(p_transaction_id, p_debit_statement_id, p_credit_statement_id, p_type, source_id, destination_id, p_amount, target.currency, 'manual_adjustment', p_reference, p_idempotency_key, p_reason, '', p_created_at);
END;
$$;
