CREATE TABLE IF NOT EXISTS session_status_history (
    id text PRIMARY KEY,
    session_id text NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
    previous_status session_status,
    next_status session_status NOT NULL,
    reason text,
    actor_user_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
