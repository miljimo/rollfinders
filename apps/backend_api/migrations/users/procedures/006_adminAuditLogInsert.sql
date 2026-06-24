CREATE OR REPLACE PROCEDURE "adminAuditLogInsert"(
    p_id text,
    p_actor_user_id text,
    p_target_user_id text,
    p_action text,
    p_metadata jsonb
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
BEGIN
    INSERT INTO admin_audit_logs (id, actor_user_id, target_user_id, action, resource, resource_id, new_value, metadata)
    VALUES (p_id, p_actor_user_id, p_target_user_id, p_action, 'user', p_target_user_id, COALESCE(p_metadata, '{}'::jsonb), COALESCE(p_metadata, '{}'::jsonb));
END;
$$;
