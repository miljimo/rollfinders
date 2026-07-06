SET search_path TO authorisation, public;

CREATE OR REPLACE FUNCTION permission_row_by_id(permission_id text)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT p.id, resource.name, resource.name, COALESCE(resource.description, ''),
           COALESCE(p.organisation_id, ''), COALESCE(p.application_id, ''), p.resource_id,
           COALESCE(p.created_by, ''), p.created_at, p.updated_at
    FROM permissions p
    JOIN resources resource ON resource.id = p.resource_id
    WHERE p.id = permission_id
$$;

CREATE OR REPLACE FUNCTION permission_row_by_code(
    permission_code text,
    requested_organisation_id text,
    requested_application_id text
)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT p.id, resource.name, resource.name, COALESCE(resource.description, ''),
           COALESCE(p.organisation_id, ''), COALESCE(p.application_id, ''), p.resource_id,
           COALESCE(p.created_by, ''), p.created_at, p.updated_at
    FROM permissions p
    JOIN resources resource ON resource.id = p.resource_id
    WHERE resource.name = permission_code
      AND (p.organisation_id IS NULL OR p.organisation_id = NULLIF(requested_organisation_id, ''))
      AND (p.application_id IS NULL OR p.application_id = NULLIF(requested_application_id, ''))
    ORDER BY
      CASE WHEN p.organisation_id IS NULL THEN 0 ELSE 1 END DESC,
      CASE WHEN p.application_id IS NULL THEN 0 ELSE 1 END DESC
    LIMIT 1
$$;

DROP FUNCTION IF EXISTS permission_list();
CREATE OR REPLACE FUNCTION permission_list(p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT p.id, resource.name, resource.name, COALESCE(resource.description, ''),
           COALESCE(p.organisation_id, ''), COALESCE(p.application_id, ''), p.resource_id,
           COALESCE(p.created_by, ''), p.created_at, p.updated_at
    FROM permissions p
    JOIN resources resource ON resource.id = p.resource_id
    ORDER BY resource.name, p.organisation_id NULLS FIRST, p.application_id NULLS FIRST
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION permission_create(
    permission_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text,
    requested_created_by text
)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    WITH inserted AS (
        INSERT INTO permissions (id, organisation_id, application_id, resource_id, created_by)
        VALUES (
            permission_id,
            NULLIF(requested_organisation_id, ''),
            NULLIF(requested_application_id, ''),
            requested_resource_id,
            NULLIF(requested_created_by, '')
        )
        RETURNING id
    )
    SELECT * FROM permission_row_by_id((SELECT inserted.id FROM inserted))
$$;

CREATE OR REPLACE FUNCTION permission_update(
    permission_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text
)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    WITH updated AS (
        UPDATE permissions
        SET organisation_id = NULLIF(requested_organisation_id, ''),
            application_id = NULLIF(requested_application_id, ''),
            resource_id = requested_resource_id,
            updated_at = now()
        WHERE id = permission_id
        RETURNING id
    )
    SELECT * FROM permission_row_by_id((SELECT updated.id FROM updated))
$$;

CREATE OR REPLACE FUNCTION resource_upsert(
    requested_id text,
    requested_name text,
    requested_description text,
    requested_target text DEFAULT ''
)
RETURNS TABLE (
    id text,
    name text,
    description text,
    target text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO resources (id, name, description, target)
    VALUES (requested_id, requested_name, NULLIF(requested_description, ''), NULLIF(requested_target, ''))
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        target = COALESCE(EXCLUDED.target, resources.target),
        updated_at = now()
    RETURNING id, name, COALESCE(description, ''), COALESCE(target, ''), created_at, updated_at
$$;

CREATE OR REPLACE FUNCTION gateway_resource_seed(
    requested_id text,
    requested_name text,
    requested_description text,
    requested_target text
)
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO resources (id, name, description, target)
    VALUES (requested_id, requested_name, NULLIF(requested_description, ''), NULLIF(requested_target, ''))
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        description = COALESCE(NULLIF(resources.description, ''), EXCLUDED.description),
        target = EXCLUDED.target,
        updated_at = now()
$$;

CREATE OR REPLACE FUNCTION gateway_legacy_resources_clean()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SET search_path TO authorisation, public
AS $$
DECLARE
    affected_count integer;
BEGIN
    DELETE FROM resources resource
    WHERE (
        resource.name LIKE 'gateway.path.%'
        OR (
            NULLIF(resource.target, '') IS NULL
            AND resource.name !~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'
        )
    )
      AND NOT EXISTS (
        SELECT 1
        FROM permissions permission
        WHERE permission.resource_id = resource.id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM user_roles user_role
        WHERE user_role.resource_id = resource.id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM user_permissions user_permission
        WHERE user_permission.resource_id = resource.id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM authorisation_audit_events event
        WHERE event.resource_id = resource.id
    );

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END $$;

DROP FUNCTION IF EXISTS resource_list();
CREATE OR REPLACE FUNCTION resource_list(p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE (
    id text,
    name text,
    description text,
    target text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT id, name, COALESCE(description, ''), COALESCE(target, ''), created_at, updated_at
    FROM resources
    ORDER BY name, id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION role_create(
    requested_id text,
    requested_key text,
    requested_name text,
    requested_description text,
    requested_level integer,
    requested_assignable boolean,
    requested_system_role boolean,
    requested_created_by text
)
RETURNS TABLE (
    id text,
    key text,
    name text,
    description text,
    level integer,
    assignable boolean,
    system_role boolean,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO roles (id, key, name, description, level, assignable, system_role, created_by)
    VALUES (requested_id, requested_key, requested_name, NULLIF(requested_description, ''), requested_level, requested_assignable, requested_system_role, NULLIF(requested_created_by, ''))
    RETURNING id, key, name, COALESCE(description, ''), level, assignable, system_role, COALESCE(created_by, ''), created_at, updated_at
$$;

CREATE OR REPLACE FUNCTION role_update(
    requested_id text,
    requested_key text,
    requested_name text,
    requested_description text,
    requested_level integer,
    requested_assignable boolean,
    requested_system_role boolean
)
RETURNS TABLE (
    id text,
    key text,
    name text,
    description text,
    level integer,
    assignable boolean,
    system_role boolean,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    UPDATE roles
    SET key = requested_key,
        name = requested_name,
        description = NULLIF(requested_description, ''),
        level = requested_level,
        assignable = requested_assignable,
        system_role = requested_system_role,
        updated_at = now()
    WHERE id = requested_id
    RETURNING id, key, name, COALESCE(description, ''), level, assignable, system_role, COALESCE(created_by, ''), created_at, updated_at
$$;

DROP FUNCTION IF EXISTS role_list();
CREATE OR REPLACE FUNCTION role_list(p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE (
    id text,
    key text,
    name text,
    description text,
    level integer,
    assignable boolean,
    system_role boolean,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT id, key, name, COALESCE(description, ''), level, assignable, system_role, COALESCE(created_by, ''), created_at, updated_at
    FROM roles
    ORDER BY level DESC, key
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION role_by_id(requested_id text)
RETURNS TABLE (
    id text,
    key text,
    name text,
    description text,
    level integer,
    assignable boolean,
    system_role boolean,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT id, key, name, COALESCE(description, ''), level, assignable, system_role, COALESCE(created_by, ''), created_at, updated_at
    FROM roles
    WHERE id = requested_id
$$;

CREATE OR REPLACE FUNCTION role_permission_add(requested_role_id text, requested_permission_id text)
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (requested_role_id, requested_permission_id)
    ON CONFLICT DO NOTHING
$$;

CREATE OR REPLACE FUNCTION role_permission_remove(requested_role_id text, requested_permission_id text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SET search_path TO authorisation, public
AS $$
DECLARE
    affected_count integer;
BEGIN
    DELETE FROM role_permissions
    WHERE role_id = requested_role_id
      AND permission_id = requested_permission_id;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count > 0;
END $$;

CREATE OR REPLACE FUNCTION role_permission_list(requested_role_id text)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT p.id, resource.name, resource.name, COALESCE(resource.description, ''),
           COALESCE(p.organisation_id, ''), COALESCE(p.application_id, ''), p.resource_id,
           COALESCE(p.created_by, ''), p.created_at, p.updated_at
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN resources resource ON resource.id = p.resource_id
    WHERE rp.role_id = requested_role_id
    ORDER BY resource.name
$$;

CREATE OR REPLACE FUNCTION scoped_resource_ensure(requested_resource_id text)
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO resources (id, name)
    SELECT requested_resource_id, requested_resource_id
    WHERE NULLIF(requested_resource_id, '') IS NOT NULL
    ON CONFLICT (id) DO UPDATE
    SET updated_at = now()
$$;

CREATE OR REPLACE FUNCTION user_role_assign(
    requested_id text,
    requested_user_id text,
    requested_role_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text,
    requested_assigned_by text
)
RETURNS TABLE (
    id text,
    user_id text,
    role_id text,
    organisation_id text,
    application_id text,
    resource_id text,
    assigned_by text,
    created_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO user_roles (id, user_id, role_id, organisation_id, application_id, resource_id, assigned_by)
    VALUES (
        requested_id,
        requested_user_id,
        requested_role_id,
        NULLIF(requested_organisation_id, ''),
        NULLIF(requested_application_id, ''),
        NULLIF(requested_resource_id, ''),
        requested_assigned_by
    )
    RETURNING id, user_id, role_id, organisation_id, application_id, resource_id, assigned_by, created_at
$$;

DROP FUNCTION IF EXISTS user_role_list(text);
CREATE OR REPLACE FUNCTION user_role_list(requested_user_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE (
    id text,
    user_id text,
    role_id text,
    organisation_id text,
    application_id text,
    resource_id text,
    assigned_by text,
    created_at timestamptz,
    role_key text
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT ur.id, ur.user_id, ur.role_id, ur.organisation_id, ur.application_id, ur.resource_id, ur.assigned_by, ur.created_at, r.key
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = requested_user_id
    ORDER BY ur.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION user_role_delete(requested_user_id text, requested_assignment_id text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SET search_path TO authorisation, public
AS $$
DECLARE
    affected_count integer;
BEGIN
    DELETE FROM user_roles
    WHERE user_id = requested_user_id
      AND id = requested_assignment_id;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count > 0;
END $$;

CREATE OR REPLACE FUNCTION user_permission_assign(
    requested_id text,
    requested_user_id text,
    requested_permission_id text,
    requested_effect text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text,
    requested_assigned_by text
)
RETURNS TABLE (
    id text,
    user_id text,
    permission_id text,
    effect text,
    organisation_id text,
    application_id text,
    resource_id text,
    assigned_by text,
    created_at timestamptz
)
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO user_permissions (id, user_id, permission_id, effect, organisation_id, application_id, resource_id, assigned_by)
    VALUES (
        requested_id,
        requested_user_id,
        requested_permission_id,
        requested_effect,
        NULLIF(requested_organisation_id, ''),
        NULLIF(requested_application_id, ''),
        NULLIF(requested_resource_id, ''),
        requested_assigned_by
    )
    RETURNING id, user_id, permission_id, effect, organisation_id, application_id, resource_id, assigned_by, created_at
$$;

DROP FUNCTION IF EXISTS user_permission_list(text);
CREATE OR REPLACE FUNCTION user_permission_list(requested_user_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE (
    id text,
    user_id text,
    permission_id text,
    effect text,
    organisation_id text,
    application_id text,
    resource_id text,
    assigned_by text,
    created_at timestamptz,
    permission_code text
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT up.id, up.user_id, up.permission_id, up.effect, up.organisation_id, up.application_id, up.resource_id, up.assigned_by, up.created_at, resource.name
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    JOIN resources resource ON resource.id = p.resource_id
    WHERE up.user_id = requested_user_id
    ORDER BY up.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION user_permission_delete(requested_user_id text, requested_assignment_id text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SET search_path TO authorisation, public
AS $$
DECLARE
    affected_count integer;
BEGIN
    DELETE FROM user_permissions
    WHERE user_id = requested_user_id
      AND id = requested_assignment_id;
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count > 0;
END $$;

CREATE OR REPLACE FUNCTION effective_role_permissions(
    requested_user_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text
)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT p.id, resource.name, resource.name, COALESCE(resource.description, ''),
           COALESCE(p.organisation_id, ''), COALESCE(p.application_id, ''), p.resource_id,
           COALESCE(p.created_by, ''), p.created_at, p.updated_at
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    JOIN resources resource ON resource.id = p.resource_id
    WHERE ur.user_id = requested_user_id
      AND scope_matches(ur.organisation_id, ur.application_id, ur.resource_id, requested_organisation_id, requested_application_id, requested_resource_id)
      AND (p.organisation_id IS NULL OR p.organisation_id = requested_organisation_id)
      AND (p.application_id IS NULL OR p.application_id = requested_application_id)
$$;

CREATE OR REPLACE FUNCTION effective_user_permissions(
    requested_user_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text
)
RETURNS TABLE (
    id text,
    code text,
    name text,
    description text,
    organisation_id text,
    application_id text,
    resource_id text,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz,
    effect text
)
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT p.id, resource.name, resource.name, COALESCE(resource.description, ''),
           COALESCE(p.organisation_id, ''), COALESCE(p.application_id, ''), p.resource_id,
           COALESCE(p.created_by, ''), p.created_at, p.updated_at, up.effect
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    JOIN resources resource ON resource.id = p.resource_id
    WHERE up.user_id = requested_user_id
      AND scope_matches(up.organisation_id, up.application_id, up.resource_id, requested_organisation_id, requested_application_id, requested_resource_id)
      AND (p.organisation_id IS NULL OR p.organisation_id = requested_organisation_id)
      AND (p.application_id IS NULL OR p.application_id = requested_application_id)
$$;

CREATE OR REPLACE FUNCTION actor_max_role_level(requested_actor_id text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT MAX(roles.level)::integer
    FROM user_roles
    JOIN roles ON roles.id = user_roles.role_id
    WHERE user_roles.user_id = requested_actor_id
$$;

CREATE OR REPLACE FUNCTION audit_event_insert(
    requested_id text,
    requested_actor_user_id text,
    requested_target_user_id text,
    requested_action text,
    requested_role_id text,
    requested_permission_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_id text,
    requested_previous_value jsonb,
    requested_new_value jsonb,
    requested_request_id text
)
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path TO authorisation, public
AS $$
    INSERT INTO authorisation_audit_events (
        id, actor_user_id, target_user_id, action, role_id, permission_id,
        organisation_id, application_id, resource_id,
        previous_value, new_value, request_id
    )
    VALUES (
        requested_id,
        NULLIF(requested_actor_user_id, ''),
        NULLIF(requested_target_user_id, ''),
        requested_action,
        NULLIF(requested_role_id, ''),
        NULLIF(requested_permission_id, ''),
        NULLIF(requested_organisation_id, ''),
        NULLIF(requested_application_id, ''),
        NULLIF(requested_resource_id, ''),
        requested_previous_value,
        requested_new_value,
        NULLIF(requested_request_id, '')
    )
$$;
