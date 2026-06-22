CREATE OR REPLACE FUNCTION organisations_list()
RETURNS TABLE (
    id text,
    name text,
    status "OrganisationStatus",
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT id, name, status, created_at, updated_at
    FROM organisations
    ORDER BY name ASC;
$$;

CREATE OR REPLACE FUNCTION organisation_get(p_id text)
RETURNS TABLE (
    id text,
    name text,
    status "OrganisationStatus",
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT id, name, status, created_at, updated_at
    FROM organisations
    WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION refresh_token_session_get(p_token_hash text)
RETURNS TABLE (
    session_id text,
    user_id text
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT s.id AS session_id, s.user_id
    FROM refresh_tokens rt
    JOIN sessions s ON s.id = rt.session_id
    WHERE rt.token_hash = p_token_hash
      AND rt.revoked_at IS NULL
      AND rt.expires_at > now()
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION sessions_list(p_user_id text)
RETURNS TABLE (
    id text,
    user_id text,
    device_id text,
    ip_address text,
    user_agent text,
    last_activity_at timestamptz,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT id, user_id, device_id, ip_address, user_agent, last_activity_at, expires_at, revoked_at, created_at
    FROM sessions
    WHERE user_id = p_user_id
    ORDER BY last_activity_at DESC;
$$;

CREATE OR REPLACE FUNCTION mfa_method_get(p_method_id text)
RETURNS TABLE (
    method_type "MfaMethodType",
    secret text
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT method_type, secret
    FROM mfa_methods
    WHERE id = p_method_id
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION password_reset_token_get(p_token_hash text)
RETURNS TABLE (
    id text,
    user_id text,
    email text,
    name text
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT prt.id, prt.user_id, c.credential_identifier AS email, NULLIF(u.display_name, '') AS name
    FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    JOIN credentials c ON c.user_id = u.id
     AND c.credential_type = 'EMAIL_PASSWORD'
     AND c.status = 'ACTIVE'
    WHERE prt.token_hash = p_token_hash
      AND prt.used_at IS NULL
      AND prt.expires_at > now()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION password_reset_token_valid(p_token_hash text)
RETURNS TABLE (valid boolean)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM password_reset_tokens
        WHERE token_hash = p_token_hash
          AND used_at IS NULL
          AND expires_at > now()
    );
$$;

CREATE OR REPLACE FUNCTION database_ready()
RETURNS TABLE (ready boolean)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT true;
$$;
