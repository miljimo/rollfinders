CREATE TABLE IF NOT EXISTS roles (
    id text PRIMARY KEY,
    key text NOT NULL UNIQUE,
    name text NOT NULL,
    level integer NOT NULL DEFAULT 100,
    description text,
    assignable boolean NOT NULL DEFAULT true,
    system_role boolean NOT NULL DEFAULT false,
    created_by text NOT NULL DEFAULT 'SYSTEM',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roles_key_idx ON roles (key);
