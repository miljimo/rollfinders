CREATE TABLE IF NOT EXISTS credentials (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_type "CredentialType" NOT NULL,
    credential_identifier text NOT NULL,
    status "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credential_secrets (
    id text PRIMARY KEY,
    credential_id text NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    password_hash text,
    secret_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS credentials_identifier_type_key ON credentials (credential_type, lower(credential_identifier));
CREATE INDEX IF NOT EXISTS credentials_user_id_idx ON credentials (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS credential_secrets_credential_id_key ON credential_secrets (credential_id);
