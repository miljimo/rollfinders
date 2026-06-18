CREATE OR REPLACE PROCEDURE "userMutationSet"(
    p_id text,
    p_role text,
    p_status text,
    p_disabled boolean
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    UPDATE users
    SET status = p_status::"UserStatus",
        disabled = p_disabled,
        updated_at = now()
    WHERE id = p_id;

    IF COALESCE(trim(p_role), '') <> '' THEN
        DELETE FROM user_roles
        WHERE user_id = p_id
          AND organisation_id IS NULL;

        INSERT INTO user_roles (user_id, role_key)
        VALUES (p_id, trim(p_role))
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;
