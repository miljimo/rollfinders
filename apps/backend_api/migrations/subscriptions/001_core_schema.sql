CREATE SCHEMA IF NOT EXISTS subscriptions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS subscriptions.products (
    key text PRIMARY KEY,
    service_key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    plan_selectable boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.product_features (
    key text PRIMARY KEY,
    product_key text NOT NULL REFERENCES subscriptions.products(key) ON UPDATE CASCADE ON DELETE RESTRICT,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    plan_selectable boolean NOT NULL DEFAULT true,
    limit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.plans (
    key text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    currency text NOT NULL DEFAULT 'GBP',
    price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
    billing_cycle text NOT NULL DEFAULT 'month' CHECK (billing_cycle IN ('free', 'month', 'year', 'manual')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.plan_features (
    plan_key text NOT NULL REFERENCES subscriptions.plans(key) ON UPDATE CASCADE ON DELETE CASCADE,
    feature_key text NOT NULL REFERENCES subscriptions.product_features(key) ON UPDATE CASCADE ON DELETE RESTRICT,
    limits jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (plan_key, feature_key)
);

CREATE TABLE IF NOT EXISTS subscriptions.subscriptions (
    id text PRIMARY KEY DEFAULT ('sub_' || replace(gen_random_uuid()::text, '-', '')),
    organisation_id text NOT NULL,
    application_id text NOT NULL,
    plan_key text NOT NULL REFERENCES subscriptions.plans(key) ON UPDATE CASCADE ON DELETE RESTRICT,
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

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_application_subscription
ON subscriptions.subscriptions (application_id)
WHERE status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

CREATE INDEX IF NOT EXISTS subscriptions_product_features_product_idx ON subscriptions.product_features(product_key);
CREATE INDEX IF NOT EXISTS subscriptions_plan_features_feature_idx ON subscriptions.plan_features(feature_key);
CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_application_idx ON subscriptions.subscriptions(application_id);
CREATE INDEX IF NOT EXISTS subscriptions_subscriptions_organisation_idx ON subscriptions.subscriptions(organisation_id);

INSERT INTO subscriptions.products (key, service_key, name, description, status, plan_selectable)
VALUES
    ('academy_management', 'academy', 'Academy Management', 'Academy profile, team, and listing capabilities.', 'ACTIVE', true),
    ('bookings', 'booking', 'Bookings', 'Course, event, and booking capabilities.', 'ACTIVE', true),
    ('analytics', 'analytics', 'Analytics', 'Operational and marketplace analytics.', 'ACTIVE', true),
    ('payments', 'payment', 'Payments', 'Payment and payout capabilities.', 'ACTIVE', true),
    ('api_access', 'api', 'API Access', 'Partner and enterprise API access.', 'ACTIVE', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO subscriptions.product_features (key, product_key, name, description, status, plan_selectable, limit_metadata)
VALUES
    ('academy.profile.manage', 'academy_management', 'Manage academy profile', 'Manage academy profile, address, images, and contact details.', 'ACTIVE', true, '{}'::jsonb),
    ('academy.team.manage', 'academy_management', 'Manage academy team', 'Manage academy owners, admins, coaches, and team members.', 'ACTIVE', true, '{}'::jsonb),
    ('academy.featured_listing', 'academy_management', 'Featured listing', 'Enable approved featured placement.', 'ACTIVE', true, '{}'::jsonb),
    ('booking.create_event', 'bookings', 'Create bookable events', 'Create courses, events, seminars, and open mats.', 'ACTIVE', true, '{"active_events_per_month":"optional"}'::jsonb),
    ('booking.unlimited_events', 'bookings', 'Unlimited events', 'Remove event-count limits for the billing period.', 'ACTIVE', true, '{}'::jsonb),
    ('analytics.dashboard.view', 'analytics', 'View analytics dashboard', 'View analytics dashboards.', 'ACTIVE', true, '{}'::jsonb),
    ('analytics.export', 'analytics', 'Export analytics', 'Export analytics reports.', 'ACTIVE', true, '{}'::jsonb),
    ('payment.online.accept', 'payments', 'Accept online payments', 'Accept online payments through configured payment providers.', 'ACTIVE', true, '{}'::jsonb),
    ('api.access.basic', 'api_access', 'Basic API access', 'Use basic API access.', 'ACTIVE', true, '{}'::jsonb),
    ('api.access.partner', 'api_access', 'Partner API access', 'Use partner or enterprise API access.', 'ACTIVE', true, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO subscriptions.plans (key, name, description, status, currency, price_minor, billing_cycle)
VALUES
    ('free', 'Free', 'Basic academy profile plan.', 'ACTIVE', 'GBP', 0, 'free'),
    ('academy_starter', 'Academy Starter', 'Profile, team, and limited booking tools.', 'ACTIVE', 'GBP', 2900, 'month'),
    ('academy_pro', 'Academy Pro', 'Advanced academy, booking, payment, and analytics tools.', 'ACTIVE', 'GBP', 7900, 'month'),
    ('enterprise', 'Enterprise', 'Full platform capabilities and API access.', 'ACTIVE', 'GBP', 19900, 'month')
ON CONFLICT (key) DO NOTHING;

INSERT INTO subscriptions.plan_features (plan_key, feature_key, limits)
VALUES
    ('free', 'academy.profile.manage', '{}'::jsonb),
    ('academy_starter', 'academy.profile.manage', '{}'::jsonb),
    ('academy_starter', 'academy.team.manage', '{}'::jsonb),
    ('academy_starter', 'booking.create_event', '{"active_events_per_month":5}'::jsonb),
    ('academy_pro', 'academy.profile.manage', '{}'::jsonb),
    ('academy_pro', 'academy.team.manage', '{}'::jsonb),
    ('academy_pro', 'academy.featured_listing', '{}'::jsonb),
    ('academy_pro', 'booking.create_event', '{}'::jsonb),
    ('academy_pro', 'booking.unlimited_events', '{}'::jsonb),
    ('academy_pro', 'analytics.dashboard.view', '{}'::jsonb),
    ('academy_pro', 'payment.online.accept', '{}'::jsonb),
    ('enterprise', 'academy.profile.manage', '{}'::jsonb),
    ('enterprise', 'academy.team.manage', '{}'::jsonb),
    ('enterprise', 'academy.featured_listing', '{}'::jsonb),
    ('enterprise', 'booking.create_event', '{}'::jsonb),
    ('enterprise', 'booking.unlimited_events', '{}'::jsonb),
    ('enterprise', 'analytics.dashboard.view', '{}'::jsonb),
    ('enterprise', 'analytics.export', '{}'::jsonb),
    ('enterprise', 'payment.online.accept', '{}'::jsonb),
    ('enterprise', 'api.access.basic', '{}'::jsonb),
    ('enterprise', 'api.access.partner', '{}'::jsonb)
ON CONFLICT (plan_key, feature_key) DO NOTHING;
