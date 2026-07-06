CREATE TABLE IF NOT EXISTS pricing.pricing_policies (
    id text PRIMARY KEY,
    policy_type text NOT NULL CHECK (policy_type IN ('PLATFORM_FEE')),
    provider_id text NOT NULL CHECK (provider_id <> ''),
    percentage_basis_points integer NOT NULL CHECK (percentage_basis_points BETWEEN 0 AND 10000),
    fixed_amount_minor bigint NOT NULL CHECK (fixed_amount_minor >= 0),
    currency text NOT NULL CHECK (currency IN ('GBP')),
    status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    version integer NOT NULL CHECK (version > 0),
    created_by text,
    updated_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pricing_policies_active_unique
ON pricing.pricing_policies(policy_type, provider_id, currency)
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS pricing_policies_lookup_idx
ON pricing.pricing_policies(policy_type, provider_id, currency, status);

INSERT INTO pricing.pricing_policies (
    id,
    policy_type,
    provider_id,
    percentage_basis_points,
    fixed_amount_minor,
    currency,
    status,
    version,
    created_by,
    updated_by
)
SELECT
    'ppol_default_stripe_platform_fee_gbp',
    'PLATFORM_FEE',
    'rollfinders-stripe-platform',
    500,
    100,
    'GBP',
    'ACTIVE',
    1,
    'system',
    'system'
WHERE NOT EXISTS (
    SELECT 1
    FROM pricing.pricing_policies
    WHERE policy_type = 'PLATFORM_FEE'
      AND provider_id = 'rollfinders-stripe-platform'
      AND currency = 'GBP'
      AND status = 'ACTIVE'
);
