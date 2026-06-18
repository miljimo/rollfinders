CREATE OR REPLACE FUNCTION user_account_get(p_user_id text)
RETURNS TABLE (
    id text,
    email text,
    role text,
    academy_id text
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT
        u.id,
        COALESCE((
            SELECT c.credential_identifier
            FROM credentials c
            WHERE c.user_id = u.id
              AND c.credential_type = 'EMAIL_PASSWORD'
            ORDER BY c.created_at ASC
            LIMIT 1
        ), '') AS email,
        COALESCE((
            SELECT ur.role_key
            FROM user_roles ur
            WHERE ur.user_id = u.id
            ORDER BY ur.organisation_id NULLS FIRST, ur.created_at ASC
            LIMIT 1
        ), '') AS role,
        (
            SELECT ou.organisation_id
            FROM organisation_users ou
            WHERE ou.user_id = u.id
              AND ou.status = 'ACTIVE'
            ORDER BY ou.created_at ASC
            LIMIT 1
        ) AS academy_id
    FROM users u
    WHERE u.id = p_user_id
      AND u.status = 'ACTIVE'
      AND u.disabled = false;
$$;
