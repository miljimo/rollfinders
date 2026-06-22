CREATE TABLE IF NOT EXISTS organisation_users (
    organisation_id text NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS organisation_users_user_id_idx ON organisation_users (user_id);
