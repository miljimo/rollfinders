CREATE SCHEMA IF NOT EXISTS subscriptions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'subscriptions'
          AND table_name = 'products'
          AND column_name = 'key'
    ) THEN
        DROP SCHEMA subscriptions CASCADE;
        CREATE SCHEMA subscriptions;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions.products (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    service_id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    is_selectable boolean NOT NULL DEFAULT true,
    currency text NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'Points')),
    price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions.products
    ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP',
    ADD COLUMN IF NOT EXISTS price_minor integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscriptions.product_features (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id text NOT NULL REFERENCES subscriptions.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    feature_key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    is_selectable boolean NOT NULL DEFAULT true,
    subscription_controlled boolean NOT NULL DEFAULT false,
    currency text NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'Points')),
    base_price_minor integer NOT NULL DEFAULT 0 CHECK (base_price_minor >= 0),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions.product_features
    ADD COLUMN IF NOT EXISTS feature_key text,
    ADD COLUMN IF NOT EXISTS subscription_controlled boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP',
    ADD COLUMN IF NOT EXISTS base_price_minor integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscriptions.plans (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    currency text NOT NULL DEFAULT 'GBP',
    price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
    discount_percent numeric(5,2) NOT NULL DEFAULT 0,
    billing_cycle text NOT NULL DEFAULT 'month' CONSTRAINT plans_billing_cycle_allowed CHECK (billing_cycle IN ('free', 'month', 'year', 'manual')),
    is_internal boolean NOT NULL DEFAULT false,
    target_user_level integer NOT NULL DEFAULT 0 CHECK (target_user_level >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions.plans
    ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE subscriptions.plans
    ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS target_user_level integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscriptions.billing_cycles (
    key text PRIMARY KEY,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
    billing_cycle_constraint text;
BEGIN
    FOR billing_cycle_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'subscriptions.plans'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%billing_cycle%'
    LOOP
        EXECUTE format('ALTER TABLE subscriptions.plans DROP CONSTRAINT %I', billing_cycle_constraint);
    END LOOP;

    UPDATE subscriptions.plans
    SET billing_cycle = CASE billing_cycle
        WHEN 'free' THEN 'free'
        WHEN 'manual' THEN 'manual'
        WHEN 'month' THEN 'month'
        WHEN 'monthly' THEN 'month'
        WHEN 'weekly' THEN 'month'
        WHEN 'year' THEN 'year'
        WHEN 'yearly' THEN 'year'
        ELSE 'month'
    END;

    ALTER TABLE subscriptions.plans ALTER COLUMN billing_cycle SET DEFAULT 'month';

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'subscriptions.plans'::regclass
          AND conname = 'plans_billing_cycle_allowed'
    ) THEN
        ALTER TABLE subscriptions.plans
            ADD CONSTRAINT plans_billing_cycle_allowed CHECK (billing_cycle IN ('free', 'month', 'year', 'manual'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions.plan_features (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    plan_id text NOT NULL REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE CASCADE,
    feature_id text NOT NULL REFERENCES subscriptions.product_features(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    limit_value jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS subscriptions.plan_products (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    plan_id text NOT NULL REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES subscriptions.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    price_adjustment_percent numeric(7,2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (plan_id, product_id)
);

ALTER TABLE subscriptions.plan_products
    ADD COLUMN IF NOT EXISTS price_adjustment_percent numeric(7,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscriptions.subscriptions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    application_id text NOT NULL DEFAULT '',
    organisation_id text NOT NULL DEFAULT '',
    owner_type text NOT NULL DEFAULT 'application' CHECK (owner_type IN ('application', 'organisation', 'academy', 'practitioner', 'partner', 'platform', 'user')),
    owner_id text NOT NULL,
    plan_id text NOT NULL REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'ACTIVE',
    billing_period_start timestamptz NOT NULL DEFAULT now(),
    billing_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
    trial_start timestamptz,
    trial_end timestamptz,
    cancel_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions.subscriptions
    ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS organisation_id text NOT NULL DEFAULT '';

DO $$
DECLARE
    subscription_owner_type_constraint text;
BEGIN
    FOR subscription_owner_type_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'subscriptions.subscriptions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%owner_type%'
    LOOP
        EXECUTE format('ALTER TABLE subscriptions.subscriptions DROP CONSTRAINT %I', subscription_owner_type_constraint);
    END LOOP;

    ALTER TABLE subscriptions.subscriptions
        ADD CONSTRAINT subscriptions_owner_type_allowed CHECK (owner_type IN (
            'application', 'organisation', 'academy', 'practitioner', 'partner', 'platform', 'user'
        ));
END $$;

CREATE TABLE IF NOT EXISTS subscriptions.subscription_owner_policies (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_type text NOT NULL UNIQUE,
    subscription_supported boolean NOT NULL DEFAULT false,
    subscription_required boolean NOT NULL DEFAULT false,
    default_plan_id text REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product patch owner policy contract names: ACADEMY, ORGANISATION, PRACTITIONER, SUPER_ADMIN, PLATFORM_ADMIN.

DO $$
DECLARE
    subscription_status_constraint text;
BEGIN
    FOR subscription_status_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'subscriptions.subscriptions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE subscriptions.subscriptions DROP CONSTRAINT %I', subscription_status_constraint);
    END LOOP;

    ALTER TABLE subscriptions.subscriptions
        ADD CONSTRAINT subscriptions_status_allowed CHECK (status IN (
            'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED',
            'pending', 'checkout_pending', 'active', 'past_due', 'scheduled_downgrade',
            'cancel_at_period_end', 'cancelled', 'suspended', 'failed'
        ));
END $$;

CREATE TABLE IF NOT EXISTS subscriptions.subscription_plan_changes (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subscription_id text NOT NULL REFERENCES subscriptions.subscriptions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    application_id text NOT NULL,
    organisation_id text NOT NULL DEFAULT '',
    from_plan_id text REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE SET NULL,
    to_plan_id text REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE SET NULL,
    change_type text NOT NULL CHECK (change_type IN ('subscribe', 'upgrade', 'downgrade', 'switch', 'cancel', 'reactivate')),
    status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'checkout_pending', 'payment_confirmed', 'scheduled', 'applied', 'rejected', 'cancelled', 'failed')),
    effective_at timestamptz,
    payment_id text NOT NULL DEFAULT '',
    checkout_id text NOT NULL DEFAULT '',
    requested_by text NOT NULL DEFAULT '',
    approved_by text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.subscription_billing_events (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subscription_id text REFERENCES subscriptions.subscriptions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    plan_change_id text REFERENCES subscriptions.subscription_plan_changes(id) ON UPDATE CASCADE ON DELETE SET NULL,
    payment_id text NOT NULL DEFAULT '',
    event_type text NOT NULL,
    status text NOT NULL DEFAULT '',
    amount_minor integer NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
    currency text NOT NULL DEFAULT 'GBP',
    provider text NOT NULL DEFAULT '',
    provider_reference text NOT NULL DEFAULT '',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.subscription_audit_events (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subscription_id text REFERENCES subscriptions.subscriptions(id) ON UPDATE CASCADE ON DELETE SET NULL,
    application_id text NOT NULL DEFAULT '',
    organisation_id text NOT NULL DEFAULT '',
    owner_type text NOT NULL DEFAULT '',
    owner_id text NOT NULL DEFAULT '',
    event_type text NOT NULL,
    previous_status text NOT NULL DEFAULT '',
    new_status text NOT NULL DEFAULT '',
    previous_plan_id text NOT NULL DEFAULT '',
    new_plan_id text NOT NULL DEFAULT '',
    actor_id text NOT NULL DEFAULT '',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.subscription_plan_audit_events (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    plan_id text REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE SET NULL,
    event_type text NOT NULL,
    previous_status text NOT NULL DEFAULT '',
    new_status text NOT NULL DEFAULT '',
    actor_id text NOT NULL DEFAULT '',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS subscriptions.subscriptions_one_active_owner_subscription;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_owner_plan_subscription
ON subscriptions.subscriptions (owner_type, owner_id, plan_id)
WHERE status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'active', 'past_due', 'scheduled_downgrade', 'cancel_at_period_end', 'suspended');

CREATE INDEX IF NOT EXISTS subscriptions_products_service_idx ON subscriptions.products(service_id);
CREATE INDEX IF NOT EXISTS subscriptions_product_features_product_idx ON subscriptions.product_features(product_id);
WITH duplicate_product_features AS (
    SELECT id, name, row_number() OVER (PARTITION BY product_id, lower(name) ORDER BY created_at, id) AS duplicate_number
    FROM subscriptions.product_features
)
UPDATE subscriptions.product_features feature
SET name = duplicate_product_features.name || ' (' || duplicate_product_features.duplicate_number || ')',
    updated_at = now()
FROM duplicate_product_features
WHERE feature.id = duplicate_product_features.id
  AND duplicate_product_features.duplicate_number > 1;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_product_features_product_name_key ON subscriptions.product_features(product_id, lower(name));
UPDATE subscriptions.product_features
SET feature_key = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '.', 'g'), '(^\.|\.$)', '', 'g'))
WHERE feature_key IS NULL OR feature_key = '';
ALTER TABLE subscriptions.product_features
    ALTER COLUMN feature_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_product_features_product_feature_key_key ON subscriptions.product_features(product_id, lower(feature_key));
CREATE INDEX IF NOT EXISTS subscriptions_plan_features_feature_idx ON subscriptions.plan_features(feature_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_products_product_idx ON subscriptions.plan_products(product_id);
CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_owner_idx ON subscriptions.subscriptions(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_application_idx ON subscriptions.subscriptions(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_organisation_idx ON subscriptions.subscriptions(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_owner_policies_owner_type_idx ON subscriptions.subscription_owner_policies(owner_type);
CREATE INDEX IF NOT EXISTS subscriptions_plan_changes_subscription_idx ON subscriptions.subscription_plan_changes(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_plan_changes_application_idx ON subscriptions.subscription_plan_changes(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_plan_changes_organisation_idx ON subscriptions.subscription_plan_changes(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_plan_changes_status_idx ON subscriptions.subscription_plan_changes(status, effective_at);
CREATE INDEX IF NOT EXISTS subscriptions_billing_events_subscription_idx ON subscriptions.subscription_billing_events(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_billing_events_plan_change_idx ON subscriptions.subscription_billing_events(plan_change_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_audit_events_subscription_idx ON subscriptions.subscription_audit_events(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_audit_events_owner_idx ON subscriptions.subscription_audit_events(owner_type, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_plan_audit_events_plan_idx ON subscriptions.subscription_plan_audit_events(plan_id, created_at DESC);
