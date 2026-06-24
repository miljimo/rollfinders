CREATE OR REPLACE FUNCTION active_super_user_exists(p_excluded_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id <> p_excluded_user_id
          AND u.status = 'ACTIVE'
          AND u.disabled = false
          AND u.is_protected = true
    );
$$;
