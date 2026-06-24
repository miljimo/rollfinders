DROP PROCEDURE IF EXISTS "userInsert"(text, text, text, text, text, text);
DROP PROCEDURE IF EXISTS "userInsert"(text, text, text, text, text);

CREATE OR REPLACE PROCEDURE "userInsert"(
    p_id text,
    p_name text,
    p_email text,
    p_password_hash text,
    p_academy_id text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO users (id, display_name, first_name, last_name, status)
    VALUES (
        p_id,
        COALESCE(NULLIF(trim(p_name), ''), lower(trim(p_email))),
        COALESCE(NULLIF(split_part(trim(COALESCE(p_name, '')), ' ', 1), ''), ''),
        COALESCE(NULLIF(trim(substr(trim(COALESCE(p_name, '')), length(split_part(trim(COALESCE(p_name, '')), ' ', 1)) + 1)), ''), ''),
        'ACTIVE'::"UserStatus"
    );

    INSERT INTO credentials (id, user_id, credential_type, credential_identifier, status)
    VALUES ('cred_' || replace(gen_random_uuid()::text, '-', ''), p_id, 'EMAIL_PASSWORD', lower(trim(p_email)), 'ACTIVE');

    INSERT INTO credential_secrets (id, credential_id, password_hash)
    SELECT 'csec_' || replace(gen_random_uuid()::text, '-', ''), c.id, p_password_hash
    FROM credentials c
    WHERE c.user_id = p_id
      AND c.credential_type = 'EMAIL_PASSWORD'
      AND lower(c.credential_identifier) = lower(trim(p_email));

    IF COALESCE(trim(p_academy_id), '') <> '' THEN
        INSERT INTO organisations (id, name, status)
        VALUES (trim(p_academy_id), trim(p_academy_id), 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO organisation_users (organisation_id, user_id, status)
        VALUES (trim(p_academy_id), p_id, 'ACTIVE')
        ON CONFLICT (organisation_id, user_id) DO UPDATE
        SET status = EXCLUDED.status,
            updated_at = now();
    END IF;
END;
$$;
