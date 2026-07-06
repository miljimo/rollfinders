CREATE TABLE IF NOT EXISTS subscription_invoices (
    invoice_id text PRIMARY KEY,
    subscription_id text NOT NULL REFERENCES subscription_billing_subscriptions(subscription_id) ON DELETE CASCADE,
    provider_invoice_id text,
    payment_id text REFERENCES payments(id) ON DELETE SET NULL,
    amount bigint NOT NULL,
    currency char(3) NOT NULL,
    status text NOT NULL,
    due_date timestamptz,
    paid_date timestamptz,
    hosted_invoice_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subscription_invoices_provider_invoice_key UNIQUE (provider_invoice_id),
    CONSTRAINT subscription_invoices_amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS subscription_invoices_subscription_idx
ON subscription_invoices(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_invoices_payment_idx
ON subscription_invoices(payment_id);
