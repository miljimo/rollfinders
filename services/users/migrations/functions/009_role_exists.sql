CREATE OR REPLACE FUNCTION role_exists(p_role_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM roles
        WHERE key = p_role_key
          AND assignable = true
    );
$$;
