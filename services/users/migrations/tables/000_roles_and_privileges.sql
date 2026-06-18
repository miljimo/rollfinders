CREATE TABLE IF NOT EXISTS roles (
    key text PRIMARY KEY,
    name text NOT NULL,
    description text,
    organisation_id text,
    is_system boolean NOT NULL DEFAULT false,
    assignable boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privileges (
    key text PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_privileges (
    role_key text NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
    privilege_key text NOT NULL REFERENCES privileges(key) ON DELETE CASCADE,
    organisation_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (role_key, privilege_key)
);

INSERT INTO privileges (key, name, description)
VALUES
    ('users.admin.access', 'Access user administration', 'Allows access to internal user-management APIs.'),
    ('users.create', 'Create users', 'Allows creating users.'),
    ('users.read.all', 'Read all users', 'Allows reading all users.'),
    ('users.update', 'Update users', 'Allows editing managed users.'),
    ('users.delete', 'Delete users', 'Allows deleting managed users.'),
    ('users.status.set', 'Set user status', 'Allows enabling and disabling users.'),
    ('users.role.assign', 'Assign roles', 'Allows assigning roles to users.'),
    ('users.protected.manage', 'Manage protected users', 'Allows modifying protected accounts.'),
    ('roles.create', 'Create roles', 'Allows creating roles.'),
    ('roles.read', 'Read roles', 'Allows reading roles.'),
    ('roles.update', 'Update roles', 'Allows updating roles.'),
    ('roles.delete', 'Delete roles', 'Allows deleting roles.'),
    ('permissions.create', 'Create permissions', 'Allows creating permissions.'),
    ('permissions.read', 'Read permissions', 'Allows reading permissions.'),
    ('permissions.assign', 'Assign permissions', 'Allows assigning permissions.'),
    ('organisations.create', 'Create organisations', 'Allows creating organisations.'),
    ('organisations.read', 'Read organisations', 'Allows reading organisations.'),
    ('organisations.update', 'Update organisations', 'Allows updating organisations.'),
    ('organisations.disable', 'Disable organisations', 'Allows disabling organisations.')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO roles (key, name, description, is_system, assignable)
VALUES
    ('USER', 'User', 'Legacy application user.', true, true),
    ('STANDARD_USER', 'Standard User', 'Default authenticated user.', true, true),
    ('ACADEMY_OWNER', 'Academy Owner', 'External academy ownership role maintained by RollFinders.', true, true),
    ('ACADEMY_ADMIN', 'Academy Admin', 'External academy administration role maintained by RollFinders.', true, true),
    ('PLATFORM_ADMIN', 'Platform Admin', 'Platform user manager.', true, true),
    ('SUPER_ADMIN', 'Super Administrator', 'System-wide administrator.', true, false),
    ('ADMIN', 'Administrator', 'System administrator.', true, false)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    assignable = EXCLUDED.assignable,
    updated_at = now();

INSERT INTO role_privileges (role_key, privilege_key)
VALUES
    ('ACADEMY_ADMIN', 'users.admin.access'),
    ('ACADEMY_ADMIN', 'users.read.all'),
    ('ACADEMY_ADMIN', 'users.create'),
    ('ACADEMY_ADMIN', 'users.update'),
    ('ACADEMY_ADMIN', 'users.status.set'),
    ('PLATFORM_ADMIN', 'users.admin.access'),
    ('PLATFORM_ADMIN', 'users.read.all'),
    ('PLATFORM_ADMIN', 'users.create'),
    ('PLATFORM_ADMIN', 'users.update'),
    ('PLATFORM_ADMIN', 'users.delete'),
    ('PLATFORM_ADMIN', 'users.status.set'),
    ('SUPER_ADMIN', 'users.admin.access'),
    ('SUPER_ADMIN', 'users.read.all'),
    ('SUPER_ADMIN', 'users.create'),
    ('SUPER_ADMIN', 'users.update'),
    ('SUPER_ADMIN', 'users.delete'),
    ('SUPER_ADMIN', 'users.status.set'),
    ('SUPER_ADMIN', 'users.role.assign'),
    ('SUPER_ADMIN', 'users.protected.manage'),
    ('SUPER_ADMIN', 'roles.create'),
    ('SUPER_ADMIN', 'roles.read'),
    ('SUPER_ADMIN', 'roles.update'),
    ('SUPER_ADMIN', 'roles.delete'),
    ('SUPER_ADMIN', 'permissions.create'),
    ('SUPER_ADMIN', 'permissions.read'),
    ('SUPER_ADMIN', 'permissions.assign'),
    ('SUPER_ADMIN', 'organisations.create'),
    ('SUPER_ADMIN', 'organisations.read'),
    ('SUPER_ADMIN', 'organisations.update'),
    ('SUPER_ADMIN', 'organisations.disable'),
    ('ADMIN', 'users.admin.access'),
    ('ADMIN', 'users.read.all'),
    ('ADMIN', 'users.create'),
    ('ADMIN', 'users.update'),
    ('ADMIN', 'users.delete'),
    ('ADMIN', 'users.status.set'),
    ('ADMIN', 'users.role.assign'),
    ('ADMIN', 'users.protected.manage'),
    ('ADMIN', 'roles.create'),
    ('ADMIN', 'roles.read'),
    ('ADMIN', 'roles.update'),
    ('ADMIN', 'roles.delete'),
    ('ADMIN', 'permissions.create'),
    ('ADMIN', 'permissions.read'),
    ('ADMIN', 'permissions.assign'),
    ('ADMIN', 'organisations.create'),
    ('ADMIN', 'organisations.read'),
    ('ADMIN', 'organisations.update'),
    ('ADMIN', 'organisations.disable')
ON CONFLICT (role_key, privilege_key) DO NOTHING;
