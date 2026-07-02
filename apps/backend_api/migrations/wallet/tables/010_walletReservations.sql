CREATE TABLE IF NOT EXISTS wallet.wallet_reservations (
    id text PRIMARY KEY,
    wallet_id text NOT NULL REFERENCES wallet.wallets(id),
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency IN ('GBP', 'Points')),
    status text NOT NULL CHECK (status IN ('ACTIVE', 'RELEASED', 'FINALIZED')),
    reference_type text,
    reference_id text,
    idempotency_key text UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_reservations_wallet_status_idx
ON wallet.wallet_reservations(wallet_id, status);

CREATE OR REPLACE FUNCTION wallet.wallet_reserved_balance(p_wallet_id text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(sum(amount), 0)
    FROM wallet.wallet_reservations
    WHERE wallet_id = p_wallet_id
      AND status = 'ACTIVE';
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
    SELECT w.id,
           w.currency,
           wallet.wallet_ledger_balance(w.id) - wallet.wallet_reserved_balance(w.id),
           wallet.wallet_reserved_balance(w.id),
           wallet.wallet_ledger_balance(w.id)
    FROM wallet.wallets w
    WHERE w.id = p_wallet_id;
$$;

CREATE OR REPLACE FUNCTION wallet.get_reservation(p_id text)
RETURNS TABLE (
    id text,
    wallet_id text,
    amount bigint,
    currency text,
    status text,
    reference_type text,
    reference_id text,
    idempotency_key text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    SELECT r.id, r.wallet_id, r.amount, r.currency, r.status, COALESCE(r.reference_type, ''),
           COALESCE(r.reference_id, ''), COALESCE(r.idempotency_key, ''), r.created_at, r.updated_at
    FROM wallet.wallet_reservations r
    WHERE r.id = p_id;
$$;

CREATE OR REPLACE FUNCTION wallet.replay_reservation(p_idempotency_key text)
RETURNS TABLE (
    id text,
    wallet_id text,
    amount bigint,
    currency text,
    status text,
    reference_type text,
    reference_id text,
    idempotency_key text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    SELECT gr.*
    FROM wallet.wallet_reservations r
    CROSS JOIN LATERAL wallet.get_reservation(r.id) gr
    WHERE r.idempotency_key = p_idempotency_key;
$$;

CREATE OR REPLACE FUNCTION wallet.reserve_funds(
    p_reservation_id text,
    p_wallet_id text,
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
    wallet_id text,
    amount bigint,
    currency text,
    status text,
    reference_type text,
    reference_id text,
    idempotency_key text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    target wallet.wallets%ROWTYPE;
    available_balance bigint;
BEGIN
    RETURN QUERY SELECT * FROM wallet.replay_reservation(p_idempotency_key);
    IF FOUND THEN
        RETURN;
    END IF;

    SELECT * INTO target FROM wallet.wallets w WHERE w.id = p_wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet not found';
    END IF;
    IF target.status = 'closed' THEN
        RAISE EXCEPTION 'wallet is read-only';
    END IF;
    IF target.status <> 'active' THEN
        RAISE EXCEPTION 'wallet is not active';
    END IF;
    IF target.currency <> p_currency THEN
        RAISE EXCEPTION 'wallet currencies must match';
    END IF;

    available_balance := wallet.wallet_ledger_balance(target.id) - wallet.wallet_reserved_balance(target.id);
    IF available_balance < p_amount THEN
        RAISE EXCEPTION 'insufficient available balance';
    END IF;

    INSERT INTO wallet.wallet_reservations (id, wallet_id, amount, currency, status, reference_type, reference_id, idempotency_key, description, created_at, updated_at)
    VALUES (p_reservation_id, target.id, p_amount, target.currency, 'ACTIVE', NULLIF(p_reference_type, ''), NULLIF(p_reference_id, ''), NULLIF(p_idempotency_key, ''), NULLIF(p_description, ''), p_created_at, p_created_at);

    RETURN QUERY SELECT * FROM wallet.get_reservation(p_reservation_id);
END;
$$;

CREATE OR REPLACE FUNCTION wallet.release_reservation(
    p_reservation_id text,
    p_idempotency_key text,
    p_description text,
    p_updated_at timestamptz
)
RETURNS TABLE (
    id text,
    wallet_id text,
    amount bigint,
    currency text,
    status text,
    reference_type text,
    reference_id text,
    idempotency_key text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    reservation wallet.wallet_reservations%ROWTYPE;
BEGIN
    SELECT * INTO reservation FROM wallet.wallet_reservations r WHERE r.id = p_reservation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'reservation not found';
    END IF;
    IF reservation.status = 'RELEASED' THEN
        RETURN QUERY SELECT * FROM wallet.get_reservation(reservation.id);
        RETURN;
    END IF;
    IF reservation.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'reservation is already closed';
    END IF;

    UPDATE wallet.wallet_reservations
    SET status = 'RELEASED',
        description = COALESCE(NULLIF(p_description, ''), description),
        updated_at = p_updated_at
    WHERE wallet_reservations.id = reservation.id;

    RETURN QUERY SELECT * FROM wallet.get_reservation(reservation.id);
END;
$$;

CREATE OR REPLACE FUNCTION wallet.finalize_reservation(
    p_transaction_id text,
    p_debit_statement_id text,
    p_credit_statement_id text,
    p_reservation_id text,
    p_counter_wallet_id text,
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
    reservation wallet.wallet_reservations%ROWTYPE;
    counter wallet.wallets%ROWTYPE;
BEGIN
    RETURN QUERY SELECT * FROM wallet.replay_transaction(p_idempotency_key);
    IF FOUND THEN
        RETURN;
    END IF;

    SELECT * INTO reservation FROM wallet.wallet_reservations r WHERE r.id = p_reservation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'reservation not found';
    END IF;
    IF reservation.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'reservation is already closed';
    END IF;

    SELECT * INTO counter FROM wallet.wallets w WHERE w.id = p_counter_wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet not found';
    END IF;
    IF counter.status = 'closed' THEN
        RAISE EXCEPTION 'wallet is read-only';
    END IF;
    IF counter.status <> 'active' THEN
        RAISE EXCEPTION 'wallet is not active';
    END IF;
    IF counter.currency <> reservation.currency THEN
        RAISE EXCEPTION 'wallet currencies must match';
    END IF;

    UPDATE wallet.wallet_reservations
    SET status = 'FINALIZED',
        description = COALESCE(NULLIF(p_description, ''), description),
        updated_at = p_created_at
    WHERE wallet_reservations.id = reservation.id;

    RETURN QUERY
    SELECT * FROM wallet.create_double_entry(
        p_transaction_id,
        p_debit_statement_id,
        p_credit_statement_id,
        'TRANSFER',
        reservation.wallet_id,
        counter.id,
        reservation.amount,
        reservation.currency,
        reservation.reference_type,
        reservation.reference_id,
        p_idempotency_key,
        COALESCE(NULLIF(p_description, ''), reservation.description, ''),
        '',
        p_created_at
    );
END;
$$;
