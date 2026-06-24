CREATE OR REPLACE FUNCTION "courseActivitiesList"(p_course_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE(
    id text,
    course_id text,
    title varchar,
    activity_type varchar,
    description text,
    start_offset_minutes integer,
    duration_minutes integer,
    sort_order integer,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = courses, public
AS $$
    SELECT ca.id, ca.course_id, ca.title, ca.activity_type, ca.description, ca.start_offset_minutes, ca.duration_minutes, ca.sort_order, ca.created_at, ca.updated_at
    FROM course_activities ca
    WHERE ca.course_id = p_course_id
    ORDER BY ca.sort_order ASC, ca.start_offset_minutes ASC, ca.created_at ASC
    LIMIT greatest(1, least(coalesce(p_limit, 10), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;
