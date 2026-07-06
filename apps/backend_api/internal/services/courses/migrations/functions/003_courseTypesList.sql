CREATE OR REPLACE FUNCTION "courseTypesList"(p_organisation_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
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
    WHERE ct.status <> 'DELETED'
    ORDER BY ct.is_default DESC, lower(ct.name) ASC
    LIMIT greatest(1, least(coalesce(p_limit, 10), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;
