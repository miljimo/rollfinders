CREATE OR REPLACE FUNCTION user_get_by_email(p_email text)
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
    SELECT *
    FROM user_get((
        SELECT c.user_id
        FROM credentials c
        WHERE c.credential_type = 'EMAIL_PASSWORD'
          AND c.status = 'ACTIVE'
          AND lower(c.credential_identifier) = lower(p_email)
        LIMIT 1
    ));
$$;

CREATE OR REPLACE FUNCTION user_get_by_identifier(p_identifier text)
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
    SELECT *
    FROM user_get((
        SELECT c.user_id
        FROM credentials c
        WHERE c.status = 'ACTIVE'
          AND c.credential_type IN ('EMAIL_PASSWORD', 'USERNAME_PASSWORD')
          AND lower(c.credential_identifier) = lower(trim(p_identifier))
        LIMIT 1
    ));
$$;
