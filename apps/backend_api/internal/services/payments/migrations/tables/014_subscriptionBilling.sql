CREATE TABLE IF NOT EXISTS subscription_billing_subscriptions (
    subscription_id text PRIMARY KEY,
    client_id text NOT NULL,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    customer_id text,
    provider text NOT NULL,
    provider_customer_id text,
    provider_subscription_id text,
    plan_id text NOT NULL,
    plan_name text NOT NULL,
    currency char(3) NOT NULL,
    amount bigint NOT NULL,
    interval text NOT NULL,
    status text NOT NULL,
    trial_start timestamptz,
    trial_end timestamptz,
    current_period_start timestamptz NOT NULL,
    current_period_end timestamptz NOT NULL,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    cancelled_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subscription_billing_provider_subscription_key UNIQUE (provider, provider_subscription_id),
    CONSTRAINT subscription_billing_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT subscription_billing_provider_check CHECK (provider IN ('stripe')),
    CONSTRAINT subscription_billing_interval_check CHECK (interval IN ('month', 'year')),
    CONSTRAINT subscription_billing_status_check CHECK (status IN ('trialing', 'active', 'past_due', 'unpaid', 'cancelled', 'paused', 'incomplete', 'incomplete_expired'))
);

CREATE INDEX IF NOT EXISTS subscription_billing_owner_idx
ON subscription_billing_subscriptions(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS subscription_billing_client_idx
ON subscription_billing_subscriptions(client_id);

CREATE INDEX IF NOT EXISTS subscription_billing_status_idx
ON subscription_billing_subscriptions(status);
