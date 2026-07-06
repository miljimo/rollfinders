CREATE TABLE IF NOT EXISTS payment_status_history (
    id bigserial PRIMARY KEY,
    payment_id text NOT NULL REFERENCES payments(id),
    from_status text,
    to_status text NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);
