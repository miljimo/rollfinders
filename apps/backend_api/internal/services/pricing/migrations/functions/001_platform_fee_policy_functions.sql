CREATE OR REPLACE FUNCTION pricing.get_active_platform_fee_policy(
    p_provider_id text,
    p_currency text
)
RETURNS TABLE (
    id text,
    policy_type text,
    provider_id text,
    percentage_basis_points integer,
    fixed_amount_minor bigint,
    currency text,
    status text,
    version integer,
    created_by text,
    updated_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF trim(coalesce(p_provider_id, '')) = '' THEN
        RAISE EXCEPTION 'provider ID is required';
    END IF;

    IF upper(trim(coalesce(p_currency, ''))) <> 'GBP' THEN
        RAISE EXCEPTION 'currency must be GBP';
    END IF;

    RETURN QUERY
    SELECT
        policy.id,
        policy.policy_type,
        policy.provider_id,
        policy.percentage_basis_points,
        policy.fixed_amount_minor,
        policy.currency,
        policy.status,
        policy.version,
        policy.created_by,
        policy.updated_by,
        policy.created_at,
        policy.updated_at
    FROM pricing.pricing_policies policy
    WHERE policy.policy_type = 'PLATFORM_FEE'
      AND policy.provider_id = trim(p_provider_id)
      AND policy.currency = upper(trim(p_currency))
      AND policy.status = 'ACTIVE'
    ORDER BY policy.version DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        policy.id,
        policy.policy_type,
        policy.provider_id,
        policy.percentage_basis_points,
        policy.fixed_amount_minor,
        policy.currency,
        policy.status,
        policy.version,
        policy.created_by,
        policy.updated_by,
        policy.created_at,
        policy.updated_at
    FROM pricing.pricing_policies policy
    WHERE policy.policy_type = 'PLATFORM_FEE'
      AND policy.provider_id = 'rollfinders-stripe-platform'
      AND policy.currency = upper(trim(p_currency))
      AND policy.status = 'ACTIVE'
    ORDER BY policy.version DESC
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION pricing.update_platform_fee_policy(
    p_id text,
    p_provider_id text,
    p_percentage_basis_points integer,
    p_fixed_amount_minor bigint,
    p_currency text,
    p_actor_user_id text
)
RETURNS TABLE (
    id text,
    policy_type text,
    provider_id text,
    percentage_basis_points integer,
    fixed_amount_minor bigint,
    currency text,
    status text,
    version integer,
    created_by text,
    updated_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    next_version integer;
    clean_provider_id text := trim(coalesce(p_provider_id, ''));
    clean_currency text := upper(trim(coalesce(p_currency, '')));
    event_id text := 'evt_' || replace(gen_random_uuid()::text, '-', '');
BEGIN
    IF trim(coalesce(p_id, '')) = '' THEN
        RAISE EXCEPTION 'pricing policy id is required';
    END IF;

    IF clean_provider_id = '' THEN
        RAISE EXCEPTION 'provider ID is required';
    END IF;

    IF clean_currency <> 'GBP' THEN
        RAISE EXCEPTION 'currency must be GBP';
    END IF;

    IF p_percentage_basis_points < 0 OR p_percentage_basis_points > 10000 THEN
        RAISE EXCEPTION 'percentage basis points must be between 0 and 10000';
    END IF;

    IF p_fixed_amount_minor < 0 THEN
        RAISE EXCEPTION 'fixed amount minor must be greater than or equal to 0';
    END IF;

    LOCK TABLE pricing.pricing_policies IN SHARE ROW EXCLUSIVE MODE;

    SELECT COALESCE(MAX(policy.version), 0) + 1
    INTO next_version
    FROM pricing.pricing_policies policy
    WHERE policy.policy_type = 'PLATFORM_FEE'
      AND policy.provider_id = clean_provider_id
      AND policy.currency = clean_currency;

    UPDATE pricing.pricing_policies policy
    SET status = 'INACTIVE',
        updated_by = NULLIF(trim(coalesce(p_actor_user_id, '')), ''),
        updated_at = now()
    WHERE policy.policy_type = 'PLATFORM_FEE'
      AND policy.provider_id = clean_provider_id
      AND policy.currency = clean_currency
      AND policy.status = 'ACTIVE';

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
        updated_by,
        created_at,
        updated_at
    )
    VALUES (
        p_id,
        'PLATFORM_FEE',
        clean_provider_id,
        p_percentage_basis_points,
        p_fixed_amount_minor,
        clean_currency,
        'ACTIVE',
        next_version,
        NULLIF(trim(coalesce(p_actor_user_id, '')), ''),
        NULLIF(trim(coalesce(p_actor_user_id, '')), ''),
        now(),
        now()
    );

    INSERT INTO pricing.outbox_events (
        id,
        event_type,
        aggregate_type,
        aggregate_id,
        payload
    )
    VALUES (
        event_id,
        'pricing.platform_fee_policy.updated',
        'pricing_policy',
        p_id,
        jsonb_build_object(
            'policy_id', p_id,
            'policy_type', 'PLATFORM_FEE',
            'provider_id', clean_provider_id,
            'currency', clean_currency,
            'percentage_basis_points', p_percentage_basis_points,
            'fixed_amount_minor', p_fixed_amount_minor,
            'version', next_version,
            'updated_by', NULLIF(trim(coalesce(p_actor_user_id, '')), ''),
            'updated_at', now()
        )
    );

    RETURN QUERY
    SELECT
        policy.id,
        policy.policy_type,
        policy.provider_id,
        policy.percentage_basis_points,
        policy.fixed_amount_minor,
        policy.currency,
        policy.status,
        policy.version,
        policy.created_by,
        policy.updated_by,
        policy.created_at,
        policy.updated_at
    FROM pricing.get_active_platform_fee_policy(clean_provider_id, clean_currency) policy
    WHERE policy.id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION pricing.preview_platform_fee(
    p_amount_minor bigint,
    p_provider_id text,
    p_currency text
)
RETURNS TABLE (
    amount_minor bigint,
    provider_id text,
    currency text,
    percentage_basis_points integer,
    fixed_amount_minor bigint,
    percentage_fee_minor bigint,
    platform_fee_minor bigint,
    net_amount_minor bigint,
    policy_id text,
    policy_version integer
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    active_policy record;
    computed_percentage_fee bigint;
    computed_platform_fee bigint;
BEGIN
    IF p_amount_minor < 0 THEN
        RAISE EXCEPTION 'amount minor must be greater than or equal to 0';
    END IF;

    SELECT *
    INTO active_policy
    FROM pricing.get_active_platform_fee_policy(p_provider_id, p_currency)
    LIMIT 1;

    IF active_policy.id IS NULL THEN
        RAISE EXCEPTION 'pricing policy not found';
    END IF;

    computed_percentage_fee := floor((p_amount_minor * active_policy.percentage_basis_points)::numeric / 10000)::bigint;
    computed_platform_fee := computed_percentage_fee + active_policy.fixed_amount_minor;
    IF computed_platform_fee > p_amount_minor THEN
        computed_platform_fee := p_amount_minor;
    END IF;

    RETURN QUERY
    SELECT
        p_amount_minor,
        active_policy.provider_id,
        active_policy.currency,
        active_policy.percentage_basis_points,
        active_policy.fixed_amount_minor,
        computed_percentage_fee,
        computed_platform_fee,
        p_amount_minor - computed_platform_fee,
        active_policy.id,
        active_policy.version;
END;
$$;
