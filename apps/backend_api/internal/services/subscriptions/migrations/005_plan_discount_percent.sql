ALTER TABLE subscriptions.plans
    ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0;
