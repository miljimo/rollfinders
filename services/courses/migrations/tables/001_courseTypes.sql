CREATE TABLE IF NOT EXISTS course_types (
    id text PRIMARY KEY,
    organisation_id text NOT NULL,
    name varchar(150) NOT NULL,
    description text,
    is_default boolean NOT NULL DEFAULT false,
    status course_status NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_types_organisation_idx ON course_types(organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS course_types_name_unique ON course_types(organisation_id, lower(name));
