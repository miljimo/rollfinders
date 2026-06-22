DROP PROCEDURE IF EXISTS "userMutationSet"(text, text, text, boolean);
DROP PROCEDURE IF EXISTS "userMutationSet"(text, text, boolean);

CREATE OR REPLACE PROCEDURE "userMutationSet"(
    p_id text,
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

END;
$$;
