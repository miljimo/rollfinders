CREATE OR REPLACE FUNCTION "coursesList"(
    p_organisation_id text,
    p_course_type_id text DEFAULT '',
    p_status text DEFAULT '',
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id text,
    organisation_id text,
    course_type_id text,
    course_type_name varchar,
    title varchar,
    description text,
    level varchar,
    capacity integer,
    price_amount numeric,
    currency varchar,
    status course_status,
    created_by_user_id text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = courses, public
AS $$
    SELECT c.id, c.organisation_id, c.course_type_id, ct.name, c.title, c.description, c.level, c.capacity, c.price_amount, c.currency, c.status, c.created_by_user_id, c.created_at, c.updated_at
    FROM courses c
    JOIN course_types ct ON ct.id = c.course_type_id
    WHERE c.organisation_id = p_organisation_id
      AND c.status <> 'DELETED'
      AND (coalesce(p_course_type_id, '') = '' OR c.course_type_id = p_course_type_id)
      AND (coalesce(p_status, '') = '' OR c.status::text = upper(p_status))
    ORDER BY c.created_at DESC, c.title ASC
    LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
    OFFSET greatest(0, coalesce(p_offset, 0));
$$;
