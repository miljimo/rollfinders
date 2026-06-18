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
