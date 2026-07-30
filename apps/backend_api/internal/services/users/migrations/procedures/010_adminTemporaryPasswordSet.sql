CREATE OR REPLACE PROCEDURE "adminTemporaryPasswordSet"(
    p_audit_id text,
    p_actor_user_id text,
    p_target_user_id text,
    p_password_hash text,
    p_reason text
)
LANGUAGE plpgsql
SET search_path TO users, public
AS $$
DECLARE
    v_updated_credentials integer;
BEGIN
    UPDATE credential_secrets cs
    SET password_hash = p_password_hash,
        updated_at = now()
    FROM credentials c
    WHERE c.id = cs.credential_id
      AND c.user_id = p_target_user_id
      AND c.credential_type IN ('EMAIL_PASSWORD', 'USERNAME_PASSWORD');

    GET DIAGNOSTICS v_updated_credentials = ROW_COUNT;
    IF v_updated_credentials = 0 THEN
        RAISE EXCEPTION 'No password credential exists for user %', p_target_user_id;
    END IF;

    UPDATE sessions
    SET revoked_at = COALESCE(revoked_at, now())
    WHERE user_id = p_target_user_id
      AND revoked_at IS NULL;

    INSERT INTO admin_audit_logs (
        id,
        actor_user_id,
        target_user_id,
        action,
        resource,
        resource_id,
        new_value,
        metadata
    )
    VALUES (
        p_audit_id,
        p_actor_user_id,
        p_target_user_id,
        'USER_TEMPORARY_PASSWORD_SET',
        'user',
        p_target_user_id,
        jsonb_build_object('sessionsRevoked', true),
        jsonb_build_object('reason', trim(p_reason), 'sessionsRevoked', true)
    );
END;
$$;
