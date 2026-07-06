CREATE TABLE IF NOT EXISTS payment_clients (
    id text PRIMARY KEY,
    name text NOT NULL,
    callback_url text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
