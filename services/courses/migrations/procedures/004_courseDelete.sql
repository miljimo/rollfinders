CREATE OR REPLACE PROCEDURE "courseDelete"(
    p_id text,
    p_organisation_id text,
    p_actor_user_id text
)
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
    UPDATE courses
    SET status = 'DELETED',
        updated_at = now()
    WHERE id = p_id
      AND (coalesce(trim(p_organisation_id), '') = '' OR organisation_id = p_organisation_id);
END;
$$;
