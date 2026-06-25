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
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.product_features (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id text NOT NULL REFERENCES subscriptions.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    is_selectable boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.plans (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    currency text NOT NULL DEFAULT 'GBP',
    price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
    billing_cycle text NOT NULL DEFAULT 'month' CONSTRAINT plans_billing_cycle_allowed CHECK (billing_cycle IN ('free', 'month', 'year', 'manual')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.billing_cycles (
    key text PRIMARY KEY,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO subscriptions.billing_cycles (key, name, sort_order)
VALUES
    ('free', 'Free', 10),
    ('month', 'Month', 20),
    ('year', 'Year', 30),
    ('manual', 'Manual', 40)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

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
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (plan_id, product_id)
);

CREATE TABLE IF NOT EXISTS subscriptions.subscriptions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_type text NOT NULL DEFAULT 'application' CHECK (owner_type IN ('application', 'organisation', 'academy', 'user')),
    owner_id text NOT NULL,
    plan_id text NOT NULL REFERENCES subscriptions.plans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED')),
    billing_period_start timestamptz NOT NULL DEFAULT now(),
    billing_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
    trial_start timestamptz,
    trial_end timestamptz,
    cancel_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_owner_subscription
ON subscriptions.subscriptions (owner_type, owner_id)
WHERE status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

CREATE INDEX IF NOT EXISTS subscriptions_products_service_idx ON subscriptions.products(service_id);
CREATE INDEX IF NOT EXISTS subscriptions_product_features_product_idx ON subscriptions.product_features(product_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_features_feature_idx ON subscriptions.plan_features(feature_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_products_product_idx ON subscriptions.plan_products(product_id);
CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_owner_idx ON subscriptions.subscriptions(owner_type, owner_id);

INSERT INTO subscriptions.products (id, service_id, name, description, status, is_selectable)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'academy', 'Academy Management', 'Academy profile, team, and listing capabilities.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000002', 'booking', 'Bookings', 'Course, event, and booking capabilities.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000003', 'analytics', 'Analytics', 'Operational and marketplace analytics.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000004', 'payment', 'Payments', 'Payment and payout capabilities.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000005', 'api', 'API Access', 'Partner and enterprise API access.', 'ACTIVE', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions.product_features (id, product_id, name, description, status, is_selectable, metadata)
VALUES
    ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Manage academy profile', 'Manage academy profile, address, images, and contact details.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Manage academy team', 'Manage academy owners, admins, coaches, and team members.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Featured listing', 'Enable approved featured placement.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'Create bookable events', 'Create courses, events, seminars, and open mats.', 'ACTIVE', true, '{"active_events_per_month":"optional"}'::jsonb),
    ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', 'Unlimited events', 'Remove event-count limits for the billing period.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000003', 'View analytics dashboard', 'View analytics dashboards.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000003', 'Export analytics', 'Export analytics reports.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000004', 'Accept online payments', 'Accept online payments through configured payment providers.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000005', 'Basic API access', 'Use basic API access.', 'ACTIVE', true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000005', 'Partner API access', 'Use partner or enterprise API access.', 'ACTIVE', true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions.plans (id, name, description, status, currency, price_minor, billing_cycle)
VALUES
    ('20000000-0000-4000-8000-000000000001', 'Free', 'Basic academy profile plan.', 'ACTIVE', 'GBP', 0, 'free'),
    ('20000000-0000-4000-8000-000000000002', 'Academy Starter', 'Profile, team, and limited booking tools.', 'ACTIVE', 'GBP', 2900, 'month'),
    ('20000000-0000-4000-8000-000000000003', 'Academy Pro', 'Advanced academy, booking, payment, and analytics tools.', 'ACTIVE', 'GBP', 7900, 'month'),
    ('20000000-0000-4000-8000-000000000004', 'Enterprise', 'Full platform capabilities and API access.', 'ACTIVE', 'GBP', 19900, 'month')
ON CONFLICT (id) DO NOTHING;

UPDATE subscriptions.plans
SET billing_cycle = CASE id
    WHEN '20000000-0000-4000-8000-000000000001' THEN 'free'
    ELSE billing_cycle
END
WHERE id IN ('20000000-0000-4000-8000-000000000001');

INSERT INTO subscriptions.plan_features (plan_id, feature_id, limit_value)
VALUES
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '{"active_events_per_month":5}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000006', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000008', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000006', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000007', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000008', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000009', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000010', '{}'::jsonb)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

INSERT INTO subscriptions.plan_products (plan_id, product_id)
SELECT DISTINCT pf.plan_id, f.product_id
FROM subscriptions.plan_features pf
JOIN subscriptions.product_features f ON f.id = pf.feature_id
ON CONFLICT (plan_id, product_id) DO NOTHING;
