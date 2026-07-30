CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source text NOT NULL CHECK (source IN ('AUTHENTICATED_DASHBOARD', 'VERIFIED_PUBLIC_WEB')),
    status text NOT NULL CHECK (status IN ('PENDING_VERIFICATION', 'PENDING_PROCESSING', 'CANCELLED')),
    token_hash text,
    token_expires_at timestamptz,
    requested_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    due_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (status = 'PENDING_VERIFICATION' AND token_hash IS NOT NULL AND token_expires_at IS NOT NULL AND verified_at IS NULL AND due_at IS NULL)
        OR
        (status = 'PENDING_PROCESSING' AND token_hash IS NULL AND token_expires_at IS NULL AND verified_at IS NOT NULL AND due_at IS NOT NULL)
        OR
        (status = 'CANCELLED' AND token_hash IS NULL AND token_expires_at IS NULL AND cancelled_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_active_user_uidx
    ON account_deletion_requests(user_id)
    WHERE status IN ('PENDING_VERIFICATION', 'PENDING_PROCESSING');

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_token_hash_uidx
    ON account_deletion_requests(token_hash)
    WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS account_deletion_requests_status_due_idx
    ON account_deletion_requests(status, due_at);
