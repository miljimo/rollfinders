CREATE OR REPLACE PROCEDURE "courseTypeUpsert"(
    p_id text,
    p_organisation_id text,
    p_name text,
    p_description text,
    p_is_default boolean,
    p_actor_user_id text
)
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
    IF coalesce(trim(p_id), '') = '' OR coalesce(trim(p_organisation_id), '') = '' OR coalesce(trim(p_name), '') = '' THEN
        RAISE EXCEPTION 'course type id, organisation id, and name are required';
    END IF;

    INSERT INTO course_types(id, organisation_id, name, description, is_default, created_by_user_id, status)
    VALUES (p_id, p_organisation_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), coalesce(p_is_default, false), nullif(trim(coalesce(p_actor_user_id, '')), ''), 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        is_default = excluded.is_default,
        status = 'ACTIVE',
        updated_at = now()
    WHERE course_types.organisation_id = excluded.organisation_id;
END;
$$;
