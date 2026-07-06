CREATE OR REPLACE PROCEDURE "userDelete"(p_id text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    DELETE FROM users
    WHERE id = p_id;
END;
$$;
