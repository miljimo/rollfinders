\set ON_ERROR_STOP on
SET search_path TO authorisation, public;

DO $$
BEGIN
    IF to_regclass('users.users') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO user_roles (
        id,
        user_id,
        role_id,
        organisation_id,
        application_id,
        resource_id,
        assigned_by
    )
    SELECT
        'role_standard_backfill_' || md5(platform_user.id || ':app_rollfinders'),
        platform_user.id,
        standard_role.id,
        NULL,
        'app_rollfinders',
        NULL,
        'SYSTEM'
    FROM users.users platform_user
    JOIN roles standard_role ON standard_role.key = 'STANDARD_USER'
    WHERE platform_user.is_protected = false
      AND platform_user.status::text <> 'DELETED'
      AND NOT EXISTS (
          SELECT 1
          FROM user_roles existing_assignment
          WHERE existing_assignment.user_id = platform_user.id
      )
    ON CONFLICT DO NOTHING;
END;
$$;

INSERT INTO schema_migrations(version) VALUES ('023_backfill_missing_standard_user_roles')
ON CONFLICT (version) DO NOTHING;
