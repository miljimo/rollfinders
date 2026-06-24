CREATE TABLE IF NOT EXISTS session_locations (
    id text PRIMARY KEY,
    session_id text NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
    location_name varchar(255),
    address text,
    city varchar(100),
    country varchar(100),
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
