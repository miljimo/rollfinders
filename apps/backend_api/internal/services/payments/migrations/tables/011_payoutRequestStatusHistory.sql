CREATE TABLE IF NOT EXISTS payout_request_status_history (
    id bigserial PRIMARY KEY,
    payout_request_id text NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    actor_id text,
    reason text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_request_status_history_request_idx
ON payout_request_status_history(payout_request_id, created_at DESC);
