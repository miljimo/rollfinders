CREATE OR REPLACE PROCEDURE "courseActivityDelete"(
    p_id text,
    p_course_id text,
    p_actor_user_id text
)
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
    DELETE FROM course_activities
    WHERE id = p_id
      AND (coalesce(trim(p_course_id), '') = '' OR course_id = p_course_id);
END;
$$;
