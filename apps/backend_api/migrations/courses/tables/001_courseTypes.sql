CREATE TABLE IF NOT EXISTS course_types (
    id text PRIMARY KEY,
    organisation_id text NOT NULL,
    name varchar(150) NOT NULL,
    description text,
    is_default boolean NOT NULL DEFAULT false,
    status course_status NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_types_organisation_idx ON course_types(organisation_id);
DROP INDEX IF EXISTS course_types_name_unique;

DO $$
BEGIN
    IF to_regclass('courses.courses') IS NOT NULL THEN
        WITH canonical_course_types AS (
            SELECT
                lower(trim(name)) AS normalized_name,
                'platform_' || trim(both '_' from regexp_replace(lower(trim(name)), '[^a-z0-9]+', '_', 'g')) AS canonical_id,
                min(organisation_id) AS organisation_id,
                min(name) AS name,
                max(description) FILTER (WHERE description IS NOT NULL AND trim(description) <> '') AS description,
                bool_or(is_default) AS is_default,
                max(created_by_user_id) FILTER (WHERE created_by_user_id IS NOT NULL AND trim(created_by_user_id) <> '') AS created_by_user_id,
                min(created_at) AS created_at,
                max(updated_at) AS updated_at
            FROM course_types
            WHERE status <> 'DELETED'
            GROUP BY lower(trim(name))
        ),
        inserted_canonical_course_types AS (
            INSERT INTO course_types(id, organisation_id, name, description, is_default, status, created_by_user_id, created_at, updated_at)
            SELECT canonical_id, organisation_id, name, description, is_default, 'ACTIVE', created_by_user_id, created_at, updated_at
            FROM canonical_course_types
            ON CONFLICT (id) DO UPDATE SET
                name = excluded.name,
                description = coalesce(course_types.description, excluded.description),
                is_default = course_types.is_default OR excluded.is_default,
                status = 'ACTIVE',
                updated_at = now()
            RETURNING id
        )
        UPDATE courses c
        SET course_type_id = canonical.canonical_id
        FROM course_types existing
        JOIN canonical_course_types canonical ON canonical.normalized_name = lower(trim(existing.name))
        WHERE c.course_type_id = existing.id
          AND c.course_type_id <> canonical.canonical_id;
    END IF;
END;
$$;

DELETE FROM course_types ct
USING course_types canonical
WHERE lower(trim(ct.name)) = lower(trim(canonical.name))
  AND ct.id <> canonical.id
  AND canonical.id = 'platform_' || trim(both '_' from regexp_replace(lower(trim(canonical.name)), '[^a-z0-9]+', '_', 'g'));

CREATE UNIQUE INDEX IF NOT EXISTS course_types_name_unique ON course_types(lower(name));

INSERT INTO course_types(id, organisation_id, name, description, is_default, status)
VALUES
    ('platform_open_mat', 'platform', 'Open Mat', 'Platform course type for open mat events.', true, 'ACTIVE'),
    ('platform_training', 'platform', 'Training', 'Platform course type for training events.', true, 'ACTIVE'),
    ('platform_seminar', 'platform', 'Seminar', 'Platform course type for seminar events.', true, 'ACTIVE'),
    ('platform_workshop', 'platform', 'Workshop', 'Platform course type for workshop events.', true, 'ACTIVE'),
    ('platform_competition', 'platform', 'Competition', 'Platform course type for competition events.', true, 'ACTIVE'),
    ('platform_private_lesson', 'platform', 'Private Lesson', 'Platform course type for private lesson events.', true, 'ACTIVE')
ON CONFLICT (lower(name)) DO UPDATE SET
    organisation_id = 'platform',
    status = 'ACTIVE',
    is_default = true,
    updated_at = now();
