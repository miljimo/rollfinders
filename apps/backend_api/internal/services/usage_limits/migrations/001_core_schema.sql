CREATE SCHEMA IF NOT EXISTS usage_limits;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usage_limits.usage_limit_rules (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subscription_plan_id text NOT NULL,
    owner_type text NOT NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,
    limit_value integer NULL CHECK (limit_value IS NULL OR limit_value >= 0),
    period_type text NOT NULL DEFAULT 'lifetime' CHECK (period_type IN ('lifetime', 'subscription_period')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (subscription_plan_id, owner_type, resource_type, action_key, period_type)
);

CREATE TABLE IF NOT EXISTS usage_limits.usage_counters (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,
    used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    period_type text NOT NULL DEFAULT 'lifetime' CHECK (period_type IN ('lifetime', 'subscription_period')),
    period_start timestamptz NULL,
    period_end timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usage_counters_unique_lifetime
    ON usage_limits.usage_counters(owner_type, owner_id, resource_type, action_key, period_type)
    WHERE period_start IS NULL AND period_end IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usage_counters_unique_period
    ON usage_limits.usage_counters(owner_type, owner_id, resource_type, action_key, period_type, period_start, period_end)
    WHERE period_start IS NOT NULL OR period_end IS NOT NULL;

CREATE TABLE IF NOT EXISTS usage_limits.usage_reservations (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    idempotency_key text NOT NULL UNIQUE,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    subscription_plan_id text NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,
    amount integer NOT NULL DEFAULT 1 CHECK (amount > 0),
    status text NOT NULL CHECK (status IN ('reserved', 'confirmed', 'released', 'expired')),
    period_type text NOT NULL DEFAULT 'lifetime' CHECK (period_type IN ('lifetime', 'subscription_period')),
    period_start timestamptz NULL,
    period_end timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz NULL,
    released_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS usage_reservations_owner_idx
    ON usage_limits.usage_reservations(owner_type, owner_id, resource_type, action_key, status);

CREATE TABLE IF NOT EXISTS usage_limits.usage_limit_overrides (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,
    limit_value integer NULL CHECK (limit_value IS NULL OR limit_value >= 0),
    period_type text NOT NULL DEFAULT 'lifetime' CHECK (period_type IN ('lifetime', 'subscription_period')),
    reason text NULL,
    created_by text NULL,
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_limit_overrides_owner_idx
    ON usage_limits.usage_limit_overrides(owner_type, owner_id, resource_type, action_key, period_type, is_active);

CREATE TABLE IF NOT EXISTS usage_limits.usage_audit_events (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_type text NOT NULL,
    owner_id text NOT NULL,
    subscription_plan_id text NULL,
    resource_type text NOT NULL,
    action_key text NOT NULL,
    decision text NOT NULL,
    reason text NULL,
    limit_value integer NULL,
    used_count integer NULL,
    reserved_count integer NULL,
    amount integer NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_audit_events_owner_idx
    ON usage_limits.usage_audit_events(owner_type, owner_id, created_at DESC);
