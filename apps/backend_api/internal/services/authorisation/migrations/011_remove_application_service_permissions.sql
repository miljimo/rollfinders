SET search_path TO authorisation, public;

DROP FUNCTION IF EXISTS permission_application_enabled(text, text);
DROP FUNCTION IF EXISTS "permissionApplicationEnabled"(text, text);
DROP TABLE IF EXISTS application_service_permissions;

INSERT INTO schema_migrations(version) VALUES ('011_remove_application_service_permissions')
ON CONFLICT (version) DO NOTHING;
