DO $$
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM users.schema_migrations
        WHERE version = '002_rollfinders_public_academy_memberships'
    ) THEN
        RETURN;
    END IF;

    EXECUTE $sql$
        INSERT INTO users.organisations (id, name, status)
        SELECT DISTINCT
            trim(pu.academy_id),
            COALESCE(NULLIF(trim(a.name), ''), trim(pu.academy_id)),
            'ACTIVE'::users."OrganisationStatus"
        FROM public.users pu
        JOIN users.users uu ON uu.id = pu.id
        LEFT JOIN public.academies a ON a.id = pu.academy_id
        WHERE COALESCE(trim(pu.academy_id), '') <> ''
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            status = EXCLUDED.status,
            updated_at = now()
    $sql$;

    EXECUTE $sql$
        INSERT INTO users.organisation_users (organisation_id, user_id, status)
        SELECT DISTINCT
            trim(pu.academy_id),
            pu.id,
            CASE
                WHEN pu.status::text = 'DISABLED' THEN 'DISABLED'::users."UserStatus"
                ELSE 'ACTIVE'::users."UserStatus"
            END
        FROM public.users pu
        JOIN users.users uu ON uu.id = pu.id
        WHERE COALESCE(trim(pu.academy_id), '') <> ''
        ON CONFLICT (organisation_id, user_id) DO UPDATE
        SET status = EXCLUDED.status,
            updated_at = now()
    $sql$;

    INSERT INTO users.schema_migrations(version)
    VALUES ('002_rollfinders_public_academy_memberships')
    ON CONFLICT (version) DO NOTHING;
END;
$$;
