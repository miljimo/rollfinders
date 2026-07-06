CREATE TABLE IF NOT EXISTS course_sessions (
    id text PRIMARY KEY,
    course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    organisation_id text NOT NULL,
    schedule_id text REFERENCES course_schedules(id) ON DELETE SET NULL,
    occurrence_key text NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    timezone varchar(100) NOT NULL DEFAULT 'Europe/London',
    capacity integer,
    status session_status NOT NULL DEFAULT 'SCHEDULED',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    CHECK (capacity IS NULL OR capacity >= 0),
    CONSTRAINT course_sessions_occurrence_unique UNIQUE (course_id, occurrence_key)
);

CREATE INDEX IF NOT EXISTS course_sessions_organisation_idx ON course_sessions(organisation_id, starts_at);
