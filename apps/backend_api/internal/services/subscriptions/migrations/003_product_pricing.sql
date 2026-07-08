ALTER TABLE subscriptions.products
    ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP',
    ADD COLUMN IF NOT EXISTS price_minor integer NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'subscriptions.products'::regclass
          AND conname = 'products_currency_allowed'
    ) THEN
        ALTER TABLE subscriptions.products
            ADD CONSTRAINT products_currency_allowed CHECK (currency IN ('GBP', 'Points'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'subscriptions.products'::regclass
          AND conname = 'products_price_minor_non_negative'
    ) THEN
        ALTER TABLE subscriptions.products
            ADD CONSTRAINT products_price_minor_non_negative CHECK (price_minor >= 0);
    END IF;
END $$;
