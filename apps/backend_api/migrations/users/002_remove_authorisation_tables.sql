\ir schema/001_user_schema.sql
SET search_path TO users, public;

DO $$
DECLARE
    legacy_roles integer := 0;
    legacy_permissions integer := 0;
    legacy_role_permissions integer := 0;
    legacy_user_roles integer := 0;
    legacy_user_permissions integer := 0;
    migrated_roles integer := 0;
    migrated_permissions integer := 0;
    migrated_role_permissions integer := 0;
    migrated_user_roles integer := 0;
    migrated_user_permissions integer := 0;
BEGIN
    IF to_regclass('users.roles') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM users.roles' INTO legacy_roles;
    END IF;
    IF to_regclass('users.privileges') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM users.privileges' INTO legacy_permissions;
    END IF;
    IF to_regclass('users.role_privileges') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM users.role_privileges' INTO legacy_role_permissions;
    END IF;
    IF to_regclass('users.user_roles') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM users.user_roles' INTO legacy_user_roles;
    END IF;
    IF to_regclass('users.user_permissions') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM users.user_permissions' INTO legacy_user_permissions;
    END IF;

    IF legacy_roles + legacy_permissions + legacy_role_permissions + legacy_user_roles + legacy_user_permissions > 0 THEN
        IF to_regclass('authorisation.roles') IS NULL
            OR to_regclass('authorisation.permissions') IS NULL
            OR to_regclass('authorisation.role_permissions') IS NULL
            OR to_regclass('authorisation.user_roles') IS NULL
            OR to_regclass('authorisation.user_permissions') IS NULL THEN
            RAISE EXCEPTION 'Authorisation schema is missing. Run Authorisation migration and users-to-authorisation data migration before dropping Users authorisation tables.';
        END IF;

        EXECUTE 'SELECT count(*) FROM authorisation.roles' INTO migrated_roles;
        EXECUTE 'SELECT count(*) FROM authorisation.permissions' INTO migrated_permissions;
        EXECUTE 'SELECT count(*) FROM authorisation.role_permissions' INTO migrated_role_permissions;
        EXECUTE 'SELECT count(*) FROM authorisation.user_roles' INTO migrated_user_roles;
        EXECUTE 'SELECT count(*) FROM authorisation.user_permissions' INTO migrated_user_permissions;

        IF migrated_roles < legacy_roles
            OR migrated_permissions < legacy_permissions
            OR migrated_role_permissions < legacy_role_permissions
            OR migrated_user_roles < legacy_user_roles
            OR migrated_user_permissions < legacy_user_permissions THEN
            RAISE EXCEPTION 'Authorisation migration is incomplete. Legacy counts roles %, permissions %, role_permissions %, user_roles %, user_permissions %; migrated counts roles %, permissions %, role_permissions %, user_roles %, user_permissions %.',
                legacy_roles, legacy_permissions, legacy_role_permissions, legacy_user_roles, legacy_user_permissions,
                migrated_roles, migrated_permissions, migrated_role_permissions, migrated_user_roles, migrated_user_permissions;
        END IF;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS roles_list();
DROP FUNCTION IF EXISTS privileges_list();
DROP FUNCTION IF EXISTS role_privileges_list(text);
DROP FUNCTION IF EXISTS user_roles_list(text);
DROP FUNCTION IF EXISTS effective_privileges_list(text);
DROP FUNCTION IF EXISTS role_exists(text);
DROP FUNCTION IF EXISTS user_has_privilege(text, text, text);

DROP PROCEDURE IF EXISTS "roleInsert"(text, text, text, text);
DROP PROCEDURE IF EXISTS "permissionInsert"(text, text, text);
DROP PROCEDURE IF EXISTS "rolePermissionAssign"(text, text, text);
DROP PROCEDURE IF EXISTS "userRoleAssign"(text, text, text, text);
DROP PROCEDURE IF EXISTS "userPermissionSet"(text, text, text, text, text);
DROP PROCEDURE IF EXISTS "userRoleRemove"(text, text);

DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_privileges;
DROP TABLE IF EXISTS privileges;
DROP TABLE IF EXISTS roles;

INSERT INTO schema_migrations(version) VALUES ('002_remove_authorisation_tables')
ON CONFLICT (version) DO NOTHING;
