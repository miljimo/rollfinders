CREATE OR REPLACE PROCEDURE "userUpdate"(
    p_id text,
    p_name text,
    p_email text,
    p_role text,
    p_status text,
    p_academy_id text DEFAULT NULL
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE users
    SET display_name = COALESCE(NULLIF(trim(p_name), ''), display_name),
        first_name = COALESCE(NULLIF(split_part(trim(COALESCE(p_name, '')), ' ', 1), ''), first_name),
        last_name = COALESCE(NULLIF(trim(substr(trim(COALESCE(p_name, '')), length(split_part(trim(COALESCE(p_name, '')), ' ', 1)) + 1)), ''), last_name),
        status = p_status::"UserStatus",
        disabled = (p_status IN ('DISABLED', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED')),
        updated_at = now()
    WHERE id = p_id;

    UPDATE credentials
    SET credential_identifier = lower(trim(p_email)),
        updated_at = now()
    WHERE user_id = p_id
      AND credential_type = 'EMAIL_PASSWORD';

    IF COALESCE(trim(p_role), '') <> '' THEN
        DELETE FROM user_roles
        WHERE user_id = p_id
          AND organisation_id IS NULL;

        INSERT INTO user_roles (user_id, role_key)
        VALUES (p_id, trim(p_role))
        ON CONFLICT DO NOTHING;
    END IF;

    DELETE FROM organisation_users
    WHERE user_id = p_id;

    IF COALESCE(trim(p_academy_id), '') <> '' THEN
        INSERT INTO organisations (id, name, status)
        VALUES (trim(p_academy_id), trim(p_academy_id), 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO organisation_users (organisation_id, user_id, status)
        VALUES (trim(p_academy_id), p_id, p_status::"UserStatus")
        ON CONFLICT (organisation_id, user_id) DO UPDATE
        SET status = EXCLUDED.status,
            updated_at = now();
    END IF;
END;
$$;
