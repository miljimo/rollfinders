CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    external_id text,
    first_name text NOT NULL DEFAULT '',
    last_name text NOT NULL DEFAULT '',
    display_name text NOT NULL DEFAULT '',
    status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    disabled boolean NOT NULL DEFAULT false,
    is_protected boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_status "UserEmailStatus" NOT NULL DEFAULT 'VALID';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE
    legacy_column text;
BEGIN
    FOREACH legacy_column IN ARRAY ARRAY[
        'email',
        'username',
        'phone',
        'password_hash',
        'email_status',
        'email_verified_at',
        'password_reset_required',
        'locked_until',
        'failed_login_attempts',
        'last_login_at',
        'name'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'users'
              AND table_name = 'users'
              AND column_name = legacy_column
        ) THEN
            EXECUTE format('ALTER TABLE users ALTER COLUMN %I DROP NOT NULL', legacy_column);
        END IF;
    END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_external_id_key ON users (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC);
