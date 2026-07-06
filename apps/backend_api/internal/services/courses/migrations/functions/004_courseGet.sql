DROP FUNCTION IF EXISTS "courseGet"(text);

CREATE OR REPLACE FUNCTION "courseGet"(p_id text)
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
    integration_metadata jsonb,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = courses, public
AS $$
    SELECT c.id, c.organisation_id, c.course_type_id, ct.name, c.title, c.description, c.level, c.capacity, c.price_amount, c.currency, c.status, c.created_by_user_id, c.integration_metadata, c.created_at, c.updated_at
    FROM courses c
    JOIN course_types ct ON ct.id = c.course_type_id
    WHERE c.id = p_id;
$$;
