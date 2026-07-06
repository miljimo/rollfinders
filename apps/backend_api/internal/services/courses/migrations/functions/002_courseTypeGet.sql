CREATE OR REPLACE FUNCTION "courseTypeGet"(p_id text)
RETURNS TABLE(
    id text,
    organisation_id text,
    name varchar,
    description text,
    is_default boolean,
    status course_status,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = courses, public
AS $$
    SELECT ct.id, ct.organisation_id, ct.name, ct.description, ct.is_default, ct.status, ct.created_at, ct.updated_at
    FROM course_types ct
    WHERE ct.id = p_id;
$$;
