SET search_path TO authorisation, public;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON true
JOIN resources resource ON resource.id = p.resource_id
WHERE r.key IN ('ACADEMY_OWNER', 'ACADEMY_ADMIN')
  AND resource.name LIKE 'wallet.%'
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations(version)
VALUES ('020_seed_academy_wallet_permissions')
ON CONFLICT (version) DO NOTHING;
