CREATE OR REPLACE FUNCTION active_super_user_exists(p_excluded_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN role_privileges rp ON rp.role_key = ur.role_key
        WHERE u.id <> p_excluded_user_id
          AND u.status = 'ACTIVE'
          AND u.disabled = false
          AND rp.privilege_key = 'users.protected.manage'
    );
$$;
