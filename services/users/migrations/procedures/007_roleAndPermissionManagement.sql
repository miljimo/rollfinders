CREATE OR REPLACE PROCEDURE "roleInsert"(
    p_key text,
    p_name text,
    p_description text,
    p_organisation_id text DEFAULT NULL
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO roles (key, name, description, organisation_id)
    VALUES (trim(p_key), trim(p_name), NULLIF(trim(p_description), ''), NULLIF(trim(p_organisation_id), ''))
    ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        organisation_id = EXCLUDED.organisation_id,
        updated_at = now();
END;
$$;

CREATE OR REPLACE PROCEDURE "permissionInsert"(
    p_key text,
    p_name text,
    p_description text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO privileges (key, name, description)
    VALUES (trim(p_key), trim(p_name), NULLIF(trim(p_description), ''))
    ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description;
END;
$$;

CREATE OR REPLACE PROCEDURE "rolePermissionAssign"(
    p_role_key text,
    p_privilege_key text,
    p_organisation_id text DEFAULT NULL
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO role_privileges (role_key, privilege_key, organisation_id)
    VALUES (trim(p_role_key), trim(p_privilege_key), NULLIF(trim(p_organisation_id), ''))
    ON CONFLICT (role_key, privilege_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE PROCEDURE "userRoleAssign"(
    p_user_id text,
    p_role_key text,
    p_organisation_id text DEFAULT NULL,
    p_assigned_by text DEFAULT NULL
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO user_roles (user_id, role_key, organisation_id, assigned_by)
    VALUES (p_user_id, trim(p_role_key), NULLIF(trim(p_organisation_id), ''), NULLIF(trim(p_assigned_by), ''))
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE PROCEDURE "userPermissionSet"(
    p_user_id text,
    p_privilege_key text,
    p_effect text,
    p_organisation_id text DEFAULT NULL,
    p_assigned_by text DEFAULT NULL
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO user_permissions (user_id, privilege_key, organisation_id, effect, assigned_by)
    VALUES (p_user_id, trim(p_privilege_key), NULLIF(trim(p_organisation_id), ''), p_effect::"DirectPermissionEffect", NULLIF(trim(p_assigned_by), ''))
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE PROCEDURE "organisationUpsert"(
    p_id text,
    p_name text,
    p_status text DEFAULT 'ACTIVE'
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO organisations (id, name, status)
    VALUES (p_id, trim(p_name), p_status::"OrganisationStatus")
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now();
END;
$$;

CREATE OR REPLACE PROCEDURE "bootstrapFromPublicUsers"()
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RETURN;
    END IF;

    EXECUTE $sql$
        INSERT INTO users.users (
            id,
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
            u.id,
            COALESCE(NULLIF(split_part(trim(COALESCE(u.name, '')), ' ', 1), ''), ''),
            COALESCE(NULLIF(trim(substr(trim(COALESCE(u.name, '')), length(split_part(trim(COALESCE(u.name, '')), ' ', 1)) + 1)), ''), ''),
            COALESCE(NULLIF(trim(u.name), ''), lower(trim(u.email))),
            CASE
                WHEN u.status::text = 'DISABLED' THEN 'DISABLED'::users."UserStatus"
                ELSE 'ACTIVE'::users."UserStatus"
            END,
            COALESCE(u.disabled, false),
            COALESCE(u.is_protected, false),
            u.created_at,
            now()
        FROM public.users u
        ON CONFLICT (id) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            display_name = EXCLUDED.display_name,
            status = EXCLUDED.status,
            disabled = EXCLUDED.disabled,
            is_protected = EXCLUDED.is_protected,
            updated_at = now()
    $sql$;

    EXECUTE $sql$
        INSERT INTO users.credentials (id, user_id, credential_type, credential_identifier, status, created_at, updated_at)
        SELECT 'cred_' || replace(gen_random_uuid()::text, '-', ''), u.id, 'EMAIL_PASSWORD'::users."CredentialType", lower(trim(u.email)), 'ACTIVE'::users."CredentialStatus", u.created_at, now()
        FROM public.users u
        ON CONFLICT (credential_type, lower(credential_identifier)) DO UPDATE
        SET credential_identifier = EXCLUDED.credential_identifier,
            status = EXCLUDED.status,
            updated_at = now()
    $sql$;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_hash'
    ) THEN
        EXECUTE $sql$
            INSERT INTO users.credential_secrets (id, credential_id, password_hash, created_at, updated_at)
            SELECT 'csec_' || replace(gen_random_uuid()::text, '-', ''), c.id, u.password_hash, u.created_at, now()
            FROM public.users u
            JOIN users.credentials c
              ON c.credential_type = 'EMAIL_PASSWORD'
             AND lower(c.credential_identifier) = lower(trim(u.email))
            ON CONFLICT (credential_id) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                updated_at = now()
        $sql$;
    END IF;

    EXECUTE $sql$
        INSERT INTO users.user_roles (user_id, role_key)
        SELECT u.id, u.role::text
        FROM public.users u
        JOIN users.roles r ON r.key = u.role::text
        ON CONFLICT DO NOTHING
    $sql$;
END;
$$;
