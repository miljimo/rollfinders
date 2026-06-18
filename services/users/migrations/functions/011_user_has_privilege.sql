CREATE OR REPLACE FUNCTION user_has_privilege(
    p_user_id text,
    p_privilege_key text,
    p_organisation_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    WITH active_user AS (
        SELECT 1
        FROM users u
        WHERE u.id = p_user_id
          AND u.status = 'ACTIVE'
          AND u.disabled = false
    ),
    direct_deny AS (
        SELECT 1
        FROM user_permissions up
        WHERE up.user_id = p_user_id
          AND up.privilege_key = p_privilege_key
          AND up.effect = 'DENY'
          AND (up.organisation_id IS NULL OR up.organisation_id = p_organisation_id)
        LIMIT 1
    ),
    direct_allow AS (
        SELECT 1
        FROM user_permissions up
        WHERE up.user_id = p_user_id
          AND up.privilege_key = p_privilege_key
          AND up.effect = 'ALLOW'
          AND (up.organisation_id IS NULL OR up.organisation_id = p_organisation_id)
        LIMIT 1
    ),
    role_allow AS (
        SELECT 1
        FROM user_roles ur
        JOIN role_privileges rp ON rp.role_key = ur.role_key
        WHERE ur.user_id = p_user_id
          AND rp.privilege_key = p_privilege_key
          AND (ur.organisation_id IS NULL OR ur.organisation_id = p_organisation_id)
        LIMIT 1
    )
    SELECT EXISTS (SELECT 1 FROM active_user)
       AND NOT EXISTS (SELECT 1 FROM direct_deny)
       AND (
           EXISTS (SELECT 1 FROM direct_allow)
           OR EXISTS (SELECT 1 FROM role_allow)
       );
$$;
