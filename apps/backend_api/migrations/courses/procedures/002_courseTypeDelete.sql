CREATE OR REPLACE PROCEDURE "courseTypeDelete"(
    p_id text,
    p_organisation_id text,
    p_actor_user_id text
)
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
    UPDATE course_types
    SET status = 'DELETED',
        updated_at = now()
    WHERE id = p_id
      AND (coalesce(trim(p_organisation_id), '') = '' OR organisation_id = p_organisation_id)
      AND NOT EXISTS (
          SELECT 1 FROM courses c
          WHERE c.course_type_id = course_types.id
            AND c.status <> 'DELETED'
      );
END;
$$;
