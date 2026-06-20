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
    IF coalesce(trim(p_id), '') = '' OR coalesce(trim(p_name), '') = '' THEN
        RAISE EXCEPTION 'course type id and name are required';
    END IF;

    INSERT INTO course_types(id, organisation_id, name, description, is_default, created_by_user_id, status)
    VALUES (p_id, coalesce(nullif(trim(p_organisation_id), ''), 'platform'), trim(p_name), nullif(trim(coalesce(p_description, '')), ''), coalesce(p_is_default, false), nullif(trim(coalesce(p_actor_user_id, '')), ''), 'ACTIVE')
    ON CONFLICT (lower(name)) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        is_default = course_types.is_default OR excluded.is_default,
        status = 'ACTIVE',
        updated_at = now();
END;
$$;
