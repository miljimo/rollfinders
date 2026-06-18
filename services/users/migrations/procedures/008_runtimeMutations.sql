CREATE OR REPLACE PROCEDURE "sessionCreate"(
    p_session_id text,
    p_user_id text,
    p_device_id text,
    p_ip_address text,
    p_user_agent text,
    p_last_activity_at timestamptz,
    p_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO sessions (id, user_id, device_id, ip_address, user_agent, last_activity_at, expires_at)
    VALUES (p_session_id, p_user_id, NULLIF(p_device_id, ''), p_ip_address, p_user_agent, p_last_activity_at, p_expires_at);
END;
$$;

CREATE OR REPLACE PROCEDURE "refreshTokenCreate"(
    p_id text,
    p_session_id text,
    p_token_hash text,
    p_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO refresh_tokens (id, session_id, token_hash, expires_at)
    VALUES (p_id, p_session_id, p_token_hash, p_expires_at);
END;
$$;

CREATE OR REPLACE PROCEDURE "sessionTouch"(p_session_id text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE sessions SET last_activity_at = now() WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE PROCEDURE "sessionsRevokeForUser"(p_user_id text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE sessions SET revoked_at = now() WHERE user_id = p_user_id AND revoked_at IS NULL;
END;
$$;

CREATE OR REPLACE PROCEDURE "sessionRevoke"(p_session_id text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE sessions SET revoked_at = now() WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE PROCEDURE "sessionRevokeByRefreshToken"(p_token_hash text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE sessions s
    SET revoked_at = now()
    FROM refresh_tokens rt
    WHERE rt.session_id = s.id
      AND rt.token_hash = p_token_hash;
END;
$$;

CREATE OR REPLACE PROCEDURE "userRegister"(
    p_id text,
    p_first_name text,
    p_last_name text,
    p_display_name text,
    p_email text,
    p_username text,
    p_password_hash text,
    p_default_role text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
DECLARE
    v_credential_id text;
BEGIN
    INSERT INTO users (id, first_name, last_name, display_name, status)
    VALUES (p_id, trim(p_first_name), trim(p_last_name), trim(p_display_name), 'ACTIVE');

    IF COALESCE(trim(p_email), '') <> '' THEN
        v_credential_id := 'cred_' || replace(gen_random_uuid()::text, '-', '');
        INSERT INTO credentials (id, user_id, credential_type, credential_identifier, status)
        VALUES (v_credential_id, p_id, 'EMAIL_PASSWORD', lower(trim(p_email)), 'ACTIVE');

        INSERT INTO credential_secrets (id, credential_id, password_hash)
        VALUES ('csec_' || replace(gen_random_uuid()::text, '-', ''), v_credential_id, p_password_hash);
    END IF;

    IF COALESCE(trim(p_username), '') <> '' THEN
        v_credential_id := 'cred_' || replace(gen_random_uuid()::text, '-', '');
        INSERT INTO credentials (id, user_id, credential_type, credential_identifier, status)
        VALUES (v_credential_id, p_id, 'USERNAME_PASSWORD', lower(trim(p_username)), 'ACTIVE');

        INSERT INTO credential_secrets (id, credential_id, password_hash)
        VALUES ('csec_' || replace(gen_random_uuid()::text, '-', ''), v_credential_id, p_password_hash);
    END IF;

    IF COALESCE(trim(p_default_role), '') <> '' THEN
        INSERT INTO user_roles (user_id, role_key)
        VALUES (p_id, trim(p_default_role))
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE "passwordChange"(p_user_id text, p_password_hash text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE credential_secrets cs
    SET password_hash = p_password_hash, updated_at = now()
    FROM credentials c
    WHERE c.id = cs.credential_id
      AND c.user_id = p_user_id
      AND c.credential_type IN ('EMAIL_PASSWORD', 'USERNAME_PASSWORD');
END;
$$;

CREATE OR REPLACE PROCEDURE "mfaMethodCreate"(
    p_id text,
    p_user_id text,
    p_method_type text,
    p_secret text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO mfa_methods (id, user_id, method_type, secret, enabled)
    VALUES (p_id, p_user_id, p_method_type::"MfaMethodType", p_secret, false);
END;
$$;

CREATE OR REPLACE PROCEDURE "mfaMethodEnable"(p_method_id text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE mfa_methods SET enabled = true, updated_at = now() WHERE id = p_method_id;
END;
$$;

CREATE OR REPLACE PROCEDURE "passwordResetTokenCreate"(
    p_id text,
    p_user_id text,
    p_token_hash text,
    p_expires_at timestamptz
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
    VALUES (p_id, p_user_id, p_token_hash, p_expires_at);
END;
$$;

CREATE OR REPLACE PROCEDURE "passwordResetComplete"(
    p_token_id text,
    p_user_id text,
    p_password_hash text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    CALL "passwordChange"(p_user_id, p_password_hash);

    UPDATE password_reset_tokens
    SET used_at = now()
    WHERE id = p_token_id;
END;
$$;

CREATE OR REPLACE PROCEDURE "userRoleRemove"(p_user_id text, p_role_key text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    DELETE FROM user_roles
    WHERE user_id = p_user_id AND role_key = p_role_key;
END;
$$;

CREATE OR REPLACE PROCEDURE "bootstrapSuperAdmin"(
    p_id text,
    p_name text,
    p_first_name text,
    p_email text,
    p_password_hash text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO users (
        id, display_name, first_name, last_name, status, disabled, is_protected
    )
    VALUES (p_id, p_name, p_first_name, '', 'ACTIVE', false, true)
    ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        first_name = EXCLUDED.first_name,
        status = 'ACTIVE',
        disabled = false,
        is_protected = true,
        updated_at = now();

    INSERT INTO credentials (id, user_id, credential_type, credential_identifier, status)
    VALUES ('cred_bootstrap_super_admin_email', p_id, 'EMAIL_PASSWORD', lower(trim(p_email)), 'ACTIVE')
    ON CONFLICT (credential_type, lower(credential_identifier)) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        status = 'ACTIVE',
        updated_at = now();

    INSERT INTO credential_secrets (id, credential_id, password_hash)
    SELECT 'csec_bootstrap_super_admin_email', id, p_password_hash
    FROM credentials
    WHERE credential_type = 'EMAIL_PASSWORD'
      AND lower(credential_identifier) = lower(trim(p_email))
    ON CONFLICT (credential_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_at = now();

    INSERT INTO user_roles (user_id, role_key)
    VALUES (p_id, 'SUPER_ADMIN')
    ON CONFLICT DO NOTHING;
END;
$$;
