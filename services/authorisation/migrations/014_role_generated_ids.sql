ALTER TABLE role_permissions
    DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;

ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE;

WITH legacy_roles(old_id) AS (
    VALUES
        ('role_user'),
        ('role_standard_user'),
        ('role_member'),
        ('role_coach'),
        ('role_academy_admin'),
        ('role_academy_owner'),
        ('role_application_admin'),
        ('role_organisation_admin'),
        ('role_organisation_owner'),
        ('role_platform_admin'),
        ('role_super_admin'),
        ('role_admin')
),
role_id_map AS (
    SELECT old_id, 'role_' || encode(gen_random_bytes(8), 'hex') AS new_id
    FROM legacy_roles
)
UPDATE roles r
SET id = m.new_id,
    updated_at = now()
FROM role_id_map m
WHERE r.id = m.old_id;
