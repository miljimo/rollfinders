CREATE OR REPLACE PROCEDURE "courseUpsert"(
    p_id text,
    p_organisation_id text,
    p_course_type_id text,
    p_title text,
    p_description text,
    p_level text,
    p_capacity integer,
    p_price_amount numeric,
    p_currency text,
    p_status text,
    p_created_by_user_id text
)
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
DECLARE
    v_status course_status := coalesce(nullif(upper(trim(p_status)), ''), 'ACTIVE')::course_status;
BEGIN
    IF coalesce(trim(p_id), '') = '' OR coalesce(trim(p_organisation_id), '') = '' OR coalesce(trim(p_course_type_id), '') = '' OR coalesce(trim(p_title), '') = '' THEN
        RAISE EXCEPTION 'course id, organisation id, course type id, and title are required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM course_types
        WHERE id = p_course_type_id
          AND organisation_id = p_organisation_id
          AND status <> 'DELETED'
    ) THEN
        RAISE EXCEPTION 'course type does not exist for organisation';
    END IF;

    INSERT INTO courses(id, organisation_id, course_type_id, title, description, level, capacity, price_amount, currency, status, created_by_user_id)
    VALUES (
        p_id,
        p_organisation_id,
        p_course_type_id,
        trim(p_title),
        nullif(trim(coalesce(p_description, '')), ''),
        nullif(trim(coalesce(p_level, '')), ''),
        p_capacity,
        p_price_amount,
        nullif(upper(trim(coalesce(p_currency, ''))), ''),
        v_status,
        nullif(trim(coalesce(p_created_by_user_id, '')), '')
    )
    ON CONFLICT (id) DO UPDATE SET
        course_type_id = excluded.course_type_id,
        title = excluded.title,
        description = excluded.description,
        level = excluded.level,
        capacity = excluded.capacity,
        price_amount = excluded.price_amount,
        currency = excluded.currency,
        status = excluded.status,
        updated_at = now()
    WHERE courses.organisation_id = excluded.organisation_id;
END;
$$;
