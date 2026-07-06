CREATE OR REPLACE PROCEDURE "courseActivityUpsert"(
    p_id text,
    p_course_id text,
    p_title text,
    p_activity_type text,
    p_description text,
    p_start_offset_minutes integer,
    p_duration_minutes integer,
    p_sort_order integer,
    p_actor_user_id text
)
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
    IF coalesce(trim(p_id), '') = '' OR coalesce(trim(p_course_id), '') = '' OR coalesce(trim(p_title), '') = '' THEN
        RAISE EXCEPTION 'activity id, course id, and title are required';
    END IF;
    IF coalesce(p_duration_minutes, 0) <= 0 THEN
        RAISE EXCEPTION 'activity duration must be positive';
    END IF;

    INSERT INTO course_activities(id, course_id, title, activity_type, description, start_offset_minutes, duration_minutes, sort_order, created_by_user_id)
    VALUES (
        p_id,
        p_course_id,
        trim(p_title),
        coalesce(nullif(upper(trim(p_activity_type)), ''), 'GENERAL'),
        nullif(trim(coalesce(p_description, '')), ''),
        greatest(0, coalesce(p_start_offset_minutes, 0)),
        p_duration_minutes,
        coalesce(p_sort_order, 0),
        nullif(trim(coalesce(p_actor_user_id, '')), '')
    )
    ON CONFLICT (id) DO UPDATE SET
        title = excluded.title,
        activity_type = excluded.activity_type,
        description = excluded.description,
        start_offset_minutes = excluded.start_offset_minutes,
        duration_minutes = excluded.duration_minutes,
        sort_order = excluded.sort_order,
        updated_at = now()
    WHERE course_activities.course_id = excluded.course_id;
END;
$$;
