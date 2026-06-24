CREATE TABLE IF NOT EXISTS course_activities (
    id text PRIMARY KEY,
    course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    activity_type varchar(100) NOT NULL DEFAULT 'GENERAL',
    description text,
    start_offset_minutes integer NOT NULL DEFAULT 0,
    duration_minutes integer NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_by_user_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (start_offset_minutes >= 0),
    CHECK (duration_minutes > 0)
);

CREATE INDEX IF NOT EXISTS course_activities_course_idx ON course_activities(course_id, sort_order, start_offset_minutes);
