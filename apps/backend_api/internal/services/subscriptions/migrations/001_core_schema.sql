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
    feature_key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    is_selectable boolean NOT NULL DEFAULT true,
    subscription_controlled boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions.product_features
    ADD COLUMN IF NOT EXISTS feature_key text,
    ADD COLUMN IF NOT EXISTS subscription_controlled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS subscriptions.plans (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    currency text NOT NULL DEFAULT 'GBP',
    price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
    billing_cycle text NOT NULL DEFAULT 'month' CONSTRAINT plans_billing_cycle_allowed CHECK (billing_cycle IN ('free', 'month', 'year', 'manual')),
    is_internal boolean NOT NULL DEFAULT false,
    target_user_level integer NOT NULL DEFAULT 100 CHECK (target_user_level >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions.plans
    ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS target_user_level integer NOT NULL DEFAULT 100;

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

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_owner_subscription
ON subscriptions.subscriptions (owner_type, owner_id)
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

INSERT INTO subscriptions.products (id, service_id, name, description, status, is_selectable)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'academy', 'Academy Management', 'Academy profile, team, and listing capabilities.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000002', 'booking', 'Bookings', 'Course, event, and booking capabilities.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000003', 'analytics', 'Analytics', 'Operational and marketplace analytics.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000004', 'payment', 'Payments', 'Payment and payout capabilities.', 'ACTIVE', true),
    ('00000000-0000-4000-8000-000000000005', 'api', 'API Access', 'Partner and enterprise API access.', 'ACTIVE', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions.product_features (id, product_id, feature_key, name, description, status, is_selectable, subscription_controlled, metadata)
VALUES
    ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'academy.profile.manage', 'Manage academy profile', 'Manage academy profile, address, images, and contact details.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'academy.team.manage', 'Manage academy team', 'Manage academy owners, admins, coaches, and team members.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'academy.listing.featured', 'Featured listing', 'Enable approved featured placement.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'course.create', 'Create bookable events', 'Create courses, events, seminars, and open mats.', 'ACTIVE', true, true, '{"active_events_per_month":"optional"}'::jsonb),
    ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', 'course.unlimited_events', 'Unlimited events', 'Remove event-count limits for the billing period.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000003', 'analytics.view', 'View analytics dashboard', 'View analytics dashboards.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000003', 'analytics.export', 'Export analytics', 'Export analytics reports.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000004', 'payment.accept_online', 'Accept online payments', 'Accept online payments through configured payment providers.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000005', 'api.basic_access', 'Basic API access', 'Use basic API access.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000005', 'api.partner_access', 'Partner API access', 'Use partner or enterprise API access.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'academy.public.view', 'View public academy profile', 'View public academy profile details.', 'ACTIVE', true, false, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'subscription.plan.view_public', 'View public subscription plans', 'View public subscription plan options.', 'ACTIVE', true, false, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000002', 'course.update', 'Update bookable events', 'Update courses, events, seminars, and open mats.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000002', 'course.delete', 'Delete bookable events', 'Delete courses, events, seminars, and open mats.', 'ACTIVE', true, true, '{}'::jsonb),
    ('10000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000002', 'booking.create', 'Create bookings', 'Create bookings for bookable events.', 'ACTIVE', true, true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

UPDATE subscriptions.product_features
SET feature_key = seed.feature_key,
    subscription_controlled = seed.subscription_controlled,
    updated_at = now()
FROM (VALUES
    ('10000000-0000-4000-8000-000000000001', 'academy.profile.manage', true),
    ('10000000-0000-4000-8000-000000000002', 'academy.team.manage', true),
    ('10000000-0000-4000-8000-000000000003', 'academy.listing.featured', true),
    ('10000000-0000-4000-8000-000000000004', 'course.create', true),
    ('10000000-0000-4000-8000-000000000005', 'course.unlimited_events', true),
    ('10000000-0000-4000-8000-000000000006', 'analytics.view', true),
    ('10000000-0000-4000-8000-000000000007', 'analytics.export', true),
    ('10000000-0000-4000-8000-000000000008', 'payment.accept_online', true),
    ('10000000-0000-4000-8000-000000000009', 'api.basic_access', true),
    ('10000000-0000-4000-8000-000000000010', 'api.partner_access', true),
    ('10000000-0000-4000-8000-000000000011', 'academy.public.view', false),
    ('10000000-0000-4000-8000-000000000012', 'subscription.plan.view_public', false),
    ('10000000-0000-4000-8000-000000000013', 'course.update', true),
    ('10000000-0000-4000-8000-000000000014', 'course.delete', true),
    ('10000000-0000-4000-8000-000000000015', 'booking.create', true)
) AS seed(id, feature_key, subscription_controlled)
WHERE product_features.id = seed.id;

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

INSERT INTO subscriptions.subscription_owner_policies (id, owner_type, subscription_supported, subscription_required, default_plan_id)
VALUES
    ('30000000-0000-4000-8000-000000000001', 'academy', true, true, '20000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000002', 'organisation', true, true, '20000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000003', 'practitioner', true, false, '20000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000004', 'partner', true, false, NULL),
    ('30000000-0000-4000-8000-000000000005', 'platform', false, false, NULL),
    ('30000000-0000-4000-8000-000000000006', 'application', false, false, NULL),
    ('30000000-0000-4000-8000-000000000007', 'user', false, false, NULL)
ON CONFLICT (owner_type) DO UPDATE SET
    subscription_supported = EXCLUDED.subscription_supported,
    subscription_required = EXCLUDED.subscription_required,
    default_plan_id = EXCLUDED.default_plan_id,
    updated_at = now();

INSERT INTO subscriptions.plan_features (plan_id, feature_id, limit_value)
VALUES
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000008', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '{"active_events_per_month":5}'::jsonb),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000013', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000013', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000014', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000015', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000006', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000008', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000013', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000014', '{}'::jsonb),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000015', '{}'::jsonb),
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
