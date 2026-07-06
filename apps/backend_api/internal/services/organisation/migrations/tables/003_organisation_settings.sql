CREATE TABLE IF NOT EXISTS organisation_settings (
    organisation_id text NOT NULL REFERENCES organisations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organisation_id, setting_key)
);
