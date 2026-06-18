DO $$
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM users.schema_migrations
        WHERE version = '001_rollfinders_public_user_credentials'
    ) THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_hash'
    ) THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'email'
    ) THEN
        RETURN;
    END IF;

    EXECUTE $sql$
        INSERT INTO users.users (
            id,
            external_id,
            first_name,
            last_name,
            display_name,
            status,
            disabled,
            is_protected,
            created_at,
            updated_at
        )
        SELECT
            pu.id,
            lower(trim(pu.email)),
            split_part(COALESCE(NULLIF(trim(pu.name), ''), lower(trim(pu.email))), ' ', 1),
            CASE
                WHEN position(' ' in COALESCE(NULLIF(trim(pu.name), ''), '')) > 0
                    THEN substring(trim(pu.name) from position(' ' in trim(pu.name)) + 1)
                ELSE ''
            END,
            COALESCE(NULLIF(trim(pu.name), ''), lower(trim(pu.email))),
            CASE
                WHEN pu.status::text = 'DISABLED' THEN 'DISABLED'::users."UserStatus"
                ELSE 'ACTIVE'::users."UserStatus"
            END,
            COALESCE(pu.disabled, false),
            COALESCE(pu.is_protected, false),
            COALESCE(pu.created_at, now()),
            COALESCE(pu.updated_at, now())
        FROM public.users pu
        WHERE COALESCE(trim(pu.id), '') <> ''
          AND COALESCE(trim(pu.email), '') <> ''
        ON CONFLICT (id) DO UPDATE
        SET external_id = COALESCE(users.users.external_id, EXCLUDED.external_id),
            first_name = COALESCE(NULLIF(users.users.first_name, ''), EXCLUDED.first_name),
            last_name = COALESCE(NULLIF(users.users.last_name, ''), EXCLUDED.last_name),
            display_name = COALESCE(NULLIF(users.users.display_name, ''), EXCLUDED.display_name),
            status = EXCLUDED.status,
            disabled = EXCLUDED.disabled,
            is_protected = EXCLUDED.is_protected,
            updated_at = now()
    $sql$;

    EXECUTE $sql$
        INSERT INTO users.credentials (
            id,
            user_id,
            credential_type,
            credential_identifier,
            status,
            created_at,
            updated_at
        )
        SELECT
            'cred_legacy_email_' || replace(pu.id, '-', '_'),
            pu.id,
            'EMAIL_PASSWORD'::users."CredentialType",
            lower(trim(pu.email)),
            'ACTIVE'::users."CredentialStatus",
            COALESCE(pu.created_at, now()),
            COALESCE(pu.updated_at, now())
        FROM public.users pu
        JOIN users.users uu ON uu.id = pu.id
        WHERE COALESCE(trim(pu.id), '') <> ''
          AND COALESCE(trim(pu.email), '') <> ''
          AND COALESCE(trim(pu.password_hash), '') <> ''
        ON CONFLICT (credential_type, lower(credential_identifier)) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            status = EXCLUDED.status,
            updated_at = now()
    $sql$;

    EXECUTE $sql$
        INSERT INTO users.credential_secrets (
            id,
            credential_id,
            password_hash,
            created_at,
            updated_at
        )
        SELECT
            'csec_legacy_email_' || replace(pu.id, '-', '_'),
            c.id,
            pu.password_hash,
            COALESCE(pu.created_at, now()),
            COALESCE(pu.updated_at, now())
        FROM public.users pu
        JOIN users.credentials c
          ON c.credential_type = 'EMAIL_PASSWORD'::users."CredentialType"
         AND lower(c.credential_identifier) = lower(trim(pu.email))
        WHERE COALESCE(trim(pu.id), '') <> ''
          AND COALESCE(trim(pu.email), '') <> ''
          AND COALESCE(trim(pu.password_hash), '') <> ''
        ON CONFLICT (credential_id) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            updated_at = now()
    $sql$;

    EXECUTE $sql$
        INSERT INTO users.user_roles (user_id, role_key, organisation_id)
        SELECT DISTINCT
            pu.id,
            CASE
                WHEN r.key IS NOT NULL THEN pu.role::text
                ELSE 'STANDARD_USER'
            END,
            NULL
        FROM public.users pu
        LEFT JOIN users.roles r ON r.key = pu.role::text
        JOIN users.users uu ON uu.id = pu.id
        WHERE COALESCE(trim(pu.id), '') <> ''
          AND NOT EXISTS (
              SELECT 1
              FROM users.user_roles existing
              WHERE existing.user_id = pu.id
                AND existing.role_key = CASE
                    WHEN r.key IS NOT NULL THEN pu.role::text
                    ELSE 'STANDARD_USER'
                END
                AND existing.organisation_id IS NULL
          )
    $sql$;

    INSERT INTO users.schema_migrations(version)
    VALUES ('001_rollfinders_public_user_credentials')
    ON CONFLICT (version) DO NOTHING;
END;
$$;
