DO $$
BEGIN
    IF to_regclass('payments.payments') IS NULL
       OR to_regclass('payments.checkouts') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO wallet.wallets (
        id,
        wallet_type,
        owner_id,
        currency,
        status,
        created_at,
        updated_at
    )
    SELECT DISTINCT
        'wal_' || substr(md5('internal:' || COALESCE(NULLIF(p.metadata->>'academy_owner_id', ''), NULLIF(p.metadata->>'academy_id', '')) || ':' || p.currency), 1, 24),
        'internal',
        COALESCE(NULLIF(p.metadata->>'academy_owner_id', ''), NULLIF(p.metadata->>'academy_id', '')),
        p.currency,
        'active',
        min(p.created_at),
        now()
    FROM payments.payments p
    JOIN payments.checkouts c ON c.payment_id = p.id
    WHERE c.resource_type = 'course_occurrence'
      AND p.status IN ('succeeded', 'paid', 'completed')
      AND p.amount_minor > 0
      AND p.currency IN ('GBP', 'Points')
      AND COALESCE(NULLIF(p.metadata->>'academy_owner_id', ''), NULLIF(p.metadata->>'academy_id', '')) IS NOT NULL
    GROUP BY COALESCE(NULLIF(p.metadata->>'academy_owner_id', ''), NULLIF(p.metadata->>'academy_id', '')), p.currency
    ON CONFLICT (id) DO UPDATE
    SET status = CASE
            WHEN wallet.wallets.status = 'closed' THEN wallet.wallets.status
            ELSE 'active'
        END,
        updated_at = now();

    INSERT INTO wallet.wallets (
        id,
        wallet_type,
        owner_id,
        currency,
        status,
        created_at,
        updated_at
    )
    SELECT DISTINCT
        'wal_' || substr(md5('internal:rollfinders-payment-clearing:' || p.currency), 1, 24),
        'internal',
        'rollfinders-payment-clearing',
        p.currency,
        'active',
        min(p.created_at),
        now()
    FROM payments.payments p
    JOIN payments.checkouts c ON c.payment_id = p.id
    WHERE c.resource_type = 'course_occurrence'
      AND p.status IN ('succeeded', 'paid', 'completed')
      AND p.amount_minor > 0
      AND p.currency IN ('GBP', 'Points')
    GROUP BY p.currency
    ON CONFLICT (id) DO UPDATE
    SET status = CASE
            WHEN wallet.wallets.status = 'closed' THEN wallet.wallets.status
            ELSE 'active'
        END,
        updated_at = now();

    WITH succeeded_course_payments AS (
        SELECT
            p.id AS payment_id,
            p.amount_minor,
            p.currency,
            p.created_at,
            COALESCE(NULLIF(p.metadata->>'academy_owner_id', ''), NULLIF(p.metadata->>'academy_id', '')) AS academy_owner_id
        FROM payments.payments p
        JOIN payments.checkouts c ON c.payment_id = p.id
        WHERE c.resource_type = 'course_occurrence'
          AND p.status IN ('succeeded', 'paid', 'completed')
          AND p.amount_minor > 0
          AND p.currency IN ('GBP', 'Points')
          AND COALESCE(NULLIF(p.metadata->>'academy_owner_id', ''), NULLIF(p.metadata->>'academy_id', '')) IS NOT NULL
    ),
    wallet_pairs AS (
        SELECT
            scp.*,
            academy_wallet.id AS academy_wallet_id,
            clearing_wallet.id AS clearing_wallet_id,
            'wtx_' || substr(md5('course-payment-wallet-credit:' || scp.payment_id), 1, 24) AS transaction_id
        FROM succeeded_course_payments scp
        JOIN wallet.wallets academy_wallet
          ON academy_wallet.owner_id = scp.academy_owner_id
         AND academy_wallet.wallet_type = 'internal'
         AND academy_wallet.currency = scp.currency
        JOIN wallet.wallets clearing_wallet
          ON clearing_wallet.owner_id = 'rollfinders-payment-clearing'
         AND clearing_wallet.wallet_type = 'internal'
         AND clearing_wallet.currency = scp.currency
    )
    INSERT INTO wallet.wallet_transactions (
        id,
        type,
        status,
        amount,
        currency,
        source_wallet_id,
        destination_wallet_id,
        reference_type,
        reference_id,
        idempotency_key,
        created_at
    )
    SELECT
        transaction_id,
        'BOOKING_PAYMENT',
        'COMPLETED',
        amount_minor,
        currency,
        clearing_wallet_id,
        academy_wallet_id,
        'payment',
        payment_id,
        'course-payment-wallet-credit:' || payment_id,
        created_at
    FROM wallet_pairs
    ON CONFLICT (idempotency_key) DO NOTHING;

    WITH transactions AS (
        SELECT
            t.id AS transaction_id,
            t.amount,
            t.currency,
            t.source_wallet_id,
            t.destination_wallet_id,
            t.reference_id,
            t.created_at
        FROM wallet.wallet_transactions t
        WHERE t.type = 'BOOKING_PAYMENT'
          AND t.reference_type = 'payment'
          AND t.idempotency_key LIKE 'course-payment-wallet-credit:%'
    )
    INSERT INTO wallet.wallet_ledger_entries (
        id,
        transaction_id,
        wallet_id,
        debit_amount,
        credit_amount,
        currency,
        description,
        created_at
    )
    SELECT
        'wle_' || substr(md5(transaction_id || ':source'), 1, 24),
        transaction_id,
        source_wallet_id,
        amount,
        0,
        currency,
        'Course payment clearing debit for ' || reference_id,
        created_at
    FROM transactions
    WHERE NOT EXISTS (
        SELECT 1
        FROM wallet.wallet_ledger_entries existing
        WHERE existing.id = 'wle_' || substr(md5(transactions.transaction_id || ':source'), 1, 24)
    )
    UNION ALL
    SELECT
        'wle_' || substr(md5(transaction_id || ':destination'), 1, 24),
        transaction_id,
        destination_wallet_id,
        0,
        amount,
        currency,
        'Course payment received for ' || reference_id,
        created_at
    FROM transactions
    WHERE NOT EXISTS (
        SELECT 1
        FROM wallet.wallet_ledger_entries existing
        WHERE existing.id = 'wle_' || substr(md5(transactions.transaction_id || ':destination'), 1, 24)
    );
END $$;
