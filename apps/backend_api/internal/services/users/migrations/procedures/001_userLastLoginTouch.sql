CREATE OR REPLACE PROCEDURE "userLastLoginTouch"(p_user_id text)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO audit_logs (id, actor_id, action, resource, resource_id, details)
    VALUES (
        'aud_' || replace(gen_random_uuid()::text, '-', ''),
        p_user_id,
        'AUTH_LOGIN',
        'user',
        p_user_id,
        '{}'::jsonb
    );
END;
$$;
