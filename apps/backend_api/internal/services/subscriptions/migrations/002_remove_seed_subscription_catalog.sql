DO $$
DECLARE
    seeded_plan_ids text[] := ARRAY[
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000004'
    ];
    seeded_feature_ids text[] := ARRAY[
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000005',
        '10000000-0000-4000-8000-000000000006',
        '10000000-0000-4000-8000-000000000007',
        '10000000-0000-4000-8000-000000000008',
        '10000000-0000-4000-8000-000000000009',
        '10000000-0000-4000-8000-000000000010',
        '10000000-0000-4000-8000-000000000011',
        '10000000-0000-4000-8000-000000000012',
        '10000000-0000-4000-8000-000000000013',
        '10000000-0000-4000-8000-000000000014',
        '10000000-0000-4000-8000-000000000015'
    ];
    seeded_product_ids text[] := ARRAY[
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000005'
    ];
    referenced_count integer;
BEGIN
    SELECT count(*)
    INTO referenced_count
    FROM subscriptions.subscriptions
    WHERE plan_id = ANY(seeded_plan_ids);

    IF referenced_count > 0 THEN
        RAISE EXCEPTION 'Refusing to remove seeded subscription plans because % subscription row(s) reference them.', referenced_count;
    END IF;

    SELECT count(*)
    INTO referenced_count
    FROM subscriptions.subscription_plan_changes
    WHERE from_plan_id = ANY(seeded_plan_ids)
       OR to_plan_id = ANY(seeded_plan_ids);

    IF referenced_count > 0 THEN
        RAISE EXCEPTION 'Refusing to remove seeded subscription plans because % plan change row(s) reference them.', referenced_count;
    END IF;

    UPDATE subscriptions.subscription_owner_policies
    SET default_plan_id = NULL,
        subscription_supported = false,
        subscription_required = false,
        updated_at = now()
    WHERE default_plan_id = ANY(seeded_plan_ids);

    DELETE FROM subscriptions.plan_products
    WHERE plan_id = ANY(seeded_plan_ids)
       OR product_id = ANY(seeded_product_ids);

    DELETE FROM subscriptions.plan_features
    WHERE plan_id = ANY(seeded_plan_ids)
       OR feature_id = ANY(seeded_feature_ids);

    DELETE FROM subscriptions.subscription_owner_policies
    WHERE id = ANY(ARRAY[
        '30000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000003',
        '30000000-0000-4000-8000-000000000004',
        '30000000-0000-4000-8000-000000000005',
        '30000000-0000-4000-8000-000000000006',
        '30000000-0000-4000-8000-000000000007'
    ]);

    DELETE FROM subscriptions.subscription_plan_audit_events
    WHERE plan_id = ANY(seeded_plan_ids);

    DELETE FROM subscriptions.plans
    WHERE id = ANY(seeded_plan_ids);

    DELETE FROM subscriptions.product_features
    WHERE id = ANY(seeded_feature_ids);

    DELETE FROM subscriptions.products
    WHERE id = ANY(seeded_product_ids);

    DELETE FROM subscriptions.billing_cycles
    WHERE key IN ('free', 'month', 'year', 'manual');
END $$;
