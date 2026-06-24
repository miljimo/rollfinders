CREATE TABLE IF NOT EXISTS courses (
    id text PRIMARY KEY,
    organisation_id text NOT NULL,
    course_type_id text NOT NULL REFERENCES course_types(id),
    title varchar(255) NOT NULL,
    description text,
    level varchar(50),
    capacity integer,
    price_amount numeric(10,2),
    currency varchar(10),
    status course_status NOT NULL DEFAULT 'ACTIVE',
    external_reference text,
    integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (capacity IS NULL OR capacity >= 0),
    CHECK (price_amount IS NULL OR price_amount >= 0)
);

CREATE INDEX IF NOT EXISTS courses_organisation_idx ON courses(organisation_id);
CREATE INDEX IF NOT EXISTS courses_course_type_idx ON courses(course_type_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses(status);
CREATE UNIQUE INDEX IF NOT EXISTS courses_external_reference_unique
    ON courses(organisation_id, external_reference)
    WHERE external_reference IS NOT NULL;

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
