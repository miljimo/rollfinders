CREATE OR REPLACE FUNCTION roles_list()
RETURNS TABLE (
    key text,
    name text,
    description text,
    organisation_id text,
    is_system boolean,
    assignable boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT key, name, description, organisation_id, is_system, assignable, created_at, updated_at
    FROM roles
    ORDER BY is_system DESC, name ASC;
$$;

CREATE OR REPLACE FUNCTION privileges_list()
RETURNS TABLE (
    key text,
    name text,
    description text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT key, name, description, created_at
    FROM privileges
    ORDER BY key ASC;
$$;

CREATE OR REPLACE FUNCTION role_privileges_list(p_role_key text)
RETURNS TABLE (
    privilege_key text,
    organisation_id text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT privilege_key, organisation_id, created_at
    FROM role_privileges
    WHERE role_key = p_role_key
    ORDER BY privilege_key ASC;
$$;

CREATE OR REPLACE FUNCTION user_roles_list(p_user_id text)
RETURNS TABLE (
    role_key text,
    organisation_id text,
    assigned_by text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT role_key, organisation_id, assigned_by, created_at
    FROM user_roles
    WHERE user_id = p_user_id
    ORDER BY organisation_id NULLS FIRST, role_key ASC;
$$;

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

CREATE OR REPLACE FUNCTION effective_privileges_list(p_user_id text)
RETURNS TABLE (privilege_key text)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT DISTINCT rp.privilege_key
    FROM user_roles ur
    JOIN role_privileges rp ON rp.role_key = ur.role_key
    WHERE ur.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM user_permissions up
        WHERE up.user_id = ur.user_id
          AND up.privilege_key = rp.privilege_key
          AND up.effect = 'DENY'
          AND (up.organisation_id IS NULL OR up.organisation_id = ur.organisation_id)
      )
    UNION
    SELECT DISTINCT up.privilege_key
    FROM user_permissions up
    WHERE up.user_id = p_user_id
      AND up.effect = 'ALLOW'
    ORDER BY privilege_key ASC;
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
