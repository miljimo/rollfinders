CREATE TABLE IF NOT EXISTS course_schedules (
    id text PRIMARY KEY,
    course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    recurrence_type varchar(50) NOT NULL,
    day_of_week integer,
    start_time time NOT NULL,
    end_time time NOT NULL,
    timezone varchar(100) NOT NULL DEFAULT 'Europe/London',
    starts_on date NOT NULL,
    ends_on date,
    created_by_user_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS course_schedules_course_idx ON course_schedules(course_id);
