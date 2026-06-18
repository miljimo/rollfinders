CREATE OR REPLACE FUNCTION user_get(p_user_id text)
RETURNS TABLE (
    id text,
    name text,
    email text,
    username text,
    first_name text,
    last_name text,
    phone text,
    password_hash text,
    role text,
    academy_id text,
    status text,
    disabled boolean,
    is_protected boolean,
    email_status text,
    last_login_at timestamptz,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT
        u.id,
        NULLIF(u.display_name, '') AS name,
        COALESCE((
            SELECT c.credential_identifier
            FROM credentials c
            WHERE c.user_id = u.id
              AND c.credential_type = 'EMAIL_PASSWORD'
            ORDER BY c.created_at ASC
            LIMIT 1
        ), '') AS email,
        (
            SELECT c.credential_identifier
            FROM credentials c
            WHERE c.user_id = u.id
              AND c.credential_type = 'USERNAME_PASSWORD'
            ORDER BY c.created_at ASC
            LIMIT 1
        ) AS username,
        u.first_name,
        u.last_name,
        NULL::text AS phone,
        COALESCE((
            SELECT cs.password_hash
            FROM credentials c
            JOIN credential_secrets cs ON cs.credential_id = c.id
            WHERE c.user_id = u.id
              AND c.credential_type IN ('EMAIL_PASSWORD', 'USERNAME_PASSWORD')
              AND c.status = 'ACTIVE'
            ORDER BY c.credential_type ASC, c.created_at ASC
            LIMIT 1
        ), '') AS password_hash,
        COALESCE((
            SELECT ur.role_key
            FROM user_roles ur
            WHERE ur.user_id = u.id
            ORDER BY ur.organisation_id NULLS FIRST, ur.created_at ASC
            LIMIT 1
        ), ''),
        NULL::text AS academy_id,
        u.status::text,
        u.disabled,
        u.is_protected,
        'VALID'::text AS email_status,
        (
            SELECT max(s.last_activity_at)
            FROM sessions s
            WHERE s.user_id = u.id
        ) AS last_login_at,
        u.created_at
    FROM users u
    WHERE u.id = p_user_id;
$$;
