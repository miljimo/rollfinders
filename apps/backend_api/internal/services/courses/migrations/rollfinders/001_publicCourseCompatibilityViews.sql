SET search_path TO courses, public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'GiType') THEN
    CREATE TYPE public."GiType" AS ENUM ('GI', 'NO_GI', 'BOTH');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'EventPricingType') THEN
    CREATE TYPE public."EventPricingType" AS ENUM ('FIXED', 'FREE', 'DONATION');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'EventAudience') THEN
    CREATE TYPE public."EventAudience" AS ENUM ('EXTERNAL_ONLY', 'EXTERNAL_AND_MEMBERS');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'CourseType') THEN
    CREATE TYPE public."CourseType" AS ENUM ('OPEN_MAT', 'TRAINING', 'SPARRING', 'SEMINAR', 'WORKSHOP', 'COMPETITION', 'PRIVATE_LESSON');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'RecurrenceType') THEN
    CREATE TYPE public."RecurrenceType" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'YEARLY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'CourseActivityType') THEN
    CREATE TYPE public."CourseActivityType" AS ENUM ('WARM_UP', 'DRILLING', 'TECHNICAL', 'ROLLING', 'SPARRING', 'COMPETITION', 'Q_AND_A', 'BREAK', 'LUNCH', 'DINNER', 'SOCIAL', 'CUSTOM');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public."rollfindersCourseTypeId"(p_academy_id text, p_course_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'platform_' || trim(both '_' from regexp_replace(lower(trim(p_course_type)), '[^a-z0-9]+', '_', 'g'));
$$;

DO $$
BEGIN
  IF to_regclass('public.events') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = 'events'
         AND c.relkind = 'r'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'events'
         AND column_name = 'course_type'
     ) THEN
    INSERT INTO courses.course_types(id, organisation_id, name, description, is_default)
    SELECT
      public."rollfindersCourseTypeId"(min(e.academy_id), e.course_type::text),
      min(e.academy_id),
      initcap(replace(e.course_type::text, '_', ' ')),
      'RollFinders course type migrated from public.events',
      true
    FROM public.events e
    GROUP BY e.course_type
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      is_default = true,
      updated_at = now();

    INSERT INTO courses.courses(
      id,
      organisation_id,
      course_type_id,
      title,
      description,
      capacity,
      price_amount,
      currency,
      status,
      created_by_user_id,
      integration_metadata,
      created_at
    )
    SELECT
      e.id,
      e.academy_id,
      public."rollfindersCourseTypeId"(e.academy_id, e.course_type::text),
      e.title,
      e.description,
      e.capacity,
      e.price,
      'GBP',
      CASE WHEN e.active THEN 'ACTIVE'::courses.course_status ELSE 'INACTIVE'::courses.course_status END,
      e.created_by_id,
      jsonb_build_object(
        'source', 'rollfinders',
        'academy_id', e.academy_id,
        'course_type', e.course_type::text,
        'event_date', e.event_date,
        'start_time', e.start_time,
        'end_time', e.end_time,
        'gi_type', e.gi_type::text,
        'pricing_type', e.pricing_type::text,
        'donation_label', e.donation_label,
        'audience', e.audience::text,
        'instructor', e.instructor,
        'contact_email', e.contact_email,
        'contact_phone', e.contact_phone,
        'location_name', e.location_name,
        'address_override', e.address_override,
        'recurrence_type', e.recurrence_type::text,
        'recurrence_interval', e.recurrence_interval,
        'recurrence_end_date', e.recurrence_end_date,
        'recurrence_limit', e.recurrence_limit
      ),
      e.created_at
    FROM public.events e
    ON CONFLICT (id) DO UPDATE SET
      organisation_id = excluded.organisation_id,
      course_type_id = excluded.course_type_id,
      title = excluded.title,
      description = excluded.description,
      capacity = excluded.capacity,
      price_amount = excluded.price_amount,
      currency = excluded.currency,
      status = excluded.status,
      integration_metadata = excluded.integration_metadata,
      updated_at = now();

    IF to_regclass('public.course_activities') IS NOT NULL THEN
      INSERT INTO courses.course_activities(
        id,
        course_id,
        title,
        activity_type,
        description,
        start_offset_minutes,
        duration_minutes,
        sort_order,
        created_at,
        updated_at
      )
      SELECT
        ca.id,
        ca.course_id,
        ca.name,
        ca.activity_type::text,
        ca.description,
        greatest(0, (
          split_part(ca.start_time, ':', 1)::integer * 60 + split_part(ca.start_time, ':', 2)::integer
        ) - (
          split_part(e.start_time, ':', 1)::integer * 60 + split_part(e.start_time, ':', 2)::integer
        )),
        greatest(1, (
          split_part(ca.end_time, ':', 1)::integer * 60 + split_part(ca.end_time, ':', 2)::integer
        ) - (
          split_part(ca.start_time, ':', 1)::integer * 60 + split_part(ca.start_time, ':', 2)::integer
        )),
        ca.sort_order,
        ca.created_at,
        ca.updated_at
      FROM public.course_activities ca
      JOIN public.events e ON e.id = ca.course_id
      ON CONFLICT (id) DO UPDATE SET
        title = excluded.title,
        activity_type = excluded.activity_type,
        description = excluded.description,
        start_offset_minutes = excluded.start_offset_minutes,
        duration_minutes = excluded.duration_minutes,
        sort_order = excluded.sort_order,
        updated_at = now();
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'analytics_events' AND c.relkind = 'r') THEN
    ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_open_mat_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'analytics_daily_metrics' AND c.relkind = 'r') THEN
    ALTER TABLE public.analytics_daily_metrics DROP CONSTRAINT IF EXISTS analytics_daily_metrics_open_mat_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'course_activities' AND c.relkind = 'r') THEN
    ALTER TABLE public.course_activities DROP CONSTRAINT IF EXISTS course_activities_course_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'events' AND c.relkind = 'r') THEN
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_academy_id_fkey;
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_created_by_id_fkey;
  END IF;
END;
$$;

DO $$
DECLARE
  v_events_kind "char";
  v_activities_kind "char";
BEGIN
  SELECT c.relkind INTO v_activities_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'course_activities';

  IF v_activities_kind = 'r' THEN
    DROP TABLE public.course_activities CASCADE;
  ELSIF v_activities_kind = 'v' THEN
    DROP VIEW public.course_activities CASCADE;
  END IF;

  SELECT c.relkind INTO v_events_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'events';

  IF v_events_kind = 'r' THEN
    DROP TABLE public.events CASCADE;
  ELSIF v_events_kind = 'v' THEN
    DROP VIEW public.events CASCADE;
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.events AS
SELECT
  c.id,
  c.organisation_id AS academy_id,
  c.created_by_user_id AS created_by_id,
  c.title,
  coalesce(c.description, '') AS description,
  coalesce((c.integration_metadata->>'event_date')::timestamp(3), c.created_at::timestamp(3)) AS event_date,
  coalesce(c.integration_metadata->>'start_time', '00:00') AS start_time,
  coalesce(c.integration_metadata->>'end_time', '00:01') AS end_time,
  coalesce(c.integration_metadata->>'gi_type', 'BOTH')::public."GiType" AS gi_type,
  coalesce(c.price_amount, 0)::numeric(8,2) AS price,
  coalesce(c.integration_metadata->>'pricing_type', CASE WHEN coalesce(c.price_amount, 0) = 0 THEN 'FREE' ELSE 'FIXED' END)::public."EventPricingType" AS pricing_type,
  nullif(c.integration_metadata->>'donation_label', '') AS donation_label,
  coalesce(c.integration_metadata->>'audience', 'EXTERNAL_ONLY')::public."EventAudience" AS audience,
  coalesce(c.integration_metadata->>'course_type', 'OPEN_MAT')::public."CourseType" AS course_type,
  nullif(c.integration_metadata->>'instructor', '') AS instructor,
  nullif(c.integration_metadata->>'contact_email', '') AS contact_email,
  nullif(c.integration_metadata->>'contact_phone', '') AS contact_phone,
  nullif(c.integration_metadata->>'location_name', '') AS location_name,
  nullif(c.integration_metadata->>'address_override', '') AS address_override,
  c.capacity,
  c.status = 'ACTIVE' AS active,
  coalesce(c.integration_metadata->>'recurrence_type', 'NONE')::public."RecurrenceType" AS recurrence_type,
  coalesce((c.integration_metadata->>'recurrence_interval')::integer, 1) AS recurrence_interval,
  nullif(c.integration_metadata->>'recurrence_end_date', '')::timestamp(3) AS recurrence_end_date,
  nullif(c.integration_metadata->>'recurrence_limit', '')::integer AS recurrence_limit,
  c.created_at::timestamp(3) AS created_at
FROM courses.courses c
WHERE c.integration_metadata->>'source' = 'rollfinders'
  AND c.status <> 'DELETED';

CREATE OR REPLACE VIEW public.course_activities AS
SELECT
  ca.id,
  ca.course_id,
  ca.title AS name,
  ca.activity_type::public."CourseActivityType" AS activity_type,
  to_char(
    (
      date '2000-01-01'
      + coalesce(e.start_time, '00:00')::time
      + (ca.start_offset_minutes || ' minutes')::interval
    )::time,
    'HH24:MI'
  ) AS start_time,
  to_char(
    (
      date '2000-01-01'
      + coalesce(e.start_time, '00:00')::time
      + ((ca.start_offset_minutes + ca.duration_minutes) || ' minutes')::interval
    )::time,
    'HH24:MI'
  ) AS end_time,
  ca.description,
  ca.sort_order,
  ca.created_at::timestamp(3) AS created_at,
  ca.updated_at::timestamp(3) AS updated_at
FROM courses.course_activities ca
JOIN public.events e ON e.id = ca.course_id;

CREATE OR REPLACE FUNCTION public."rollfindersEventViewUpsert"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
DECLARE
  v_course_type_id text := public."rollfindersCourseTypeId"(NEW.academy_id, NEW.course_type::text);
BEGIN
  CALL courses."courseTypeUpsert"(
    v_course_type_id,
    NEW.academy_id,
    initcap(replace(NEW.course_type::text, '_', ' ')),
    'RollFinders course type',
    true,
    NEW.created_by_id
  );

  CALL courses."courseUpsert"(
    NEW.id,
    NEW.academy_id,
    v_course_type_id,
    NEW.title,
    NEW.description,
    '',
    NEW.capacity,
    NEW.price,
    'GBP',
    CASE WHEN NEW.active THEN 'ACTIVE' ELSE 'INACTIVE' END,
    NEW.created_by_id,
    jsonb_build_object(
      'source', 'rollfinders',
      'academy_id', NEW.academy_id,
      'course_type', NEW.course_type::text,
      'event_date', NEW.event_date,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'gi_type', NEW.gi_type::text,
      'pricing_type', NEW.pricing_type::text,
      'donation_label', NEW.donation_label,
      'audience', NEW.audience::text,
      'instructor', NEW.instructor,
      'contact_email', NEW.contact_email,
      'contact_phone', NEW.contact_phone,
      'location_name', NEW.location_name,
      'address_override', NEW.address_override,
      'recurrence_type', NEW.recurrence_type::text,
      'recurrence_interval', NEW.recurrence_interval,
      'recurrence_end_date', NEW.recurrence_end_date,
      'recurrence_limit', NEW.recurrence_limit
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public."rollfindersEventViewDelete"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
  CALL courses."courseDelete"(OLD.id, OLD.created_by_id, 'Deleted through RollFinders compatibility view');
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER rollfinders_events_view_insert
INSTEAD OF INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public."rollfindersEventViewUpsert"();

CREATE OR REPLACE TRIGGER rollfinders_events_view_update
INSTEAD OF UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public."rollfindersEventViewUpsert"();

CREATE OR REPLACE TRIGGER rollfinders_events_view_delete
INSTEAD OF DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public."rollfindersEventViewDelete"();

CREATE OR REPLACE FUNCTION public."rollfindersActivityViewUpsert"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
DECLARE
  v_event_start integer;
  v_activity_start integer;
  v_activity_end integer;
BEGIN
  SELECT split_part(e.start_time, ':', 1)::integer * 60 + split_part(e.start_time, ':', 2)::integer
  INTO v_event_start
  FROM public.events e
  WHERE e.id = NEW.course_id;

  v_activity_start := split_part(NEW.start_time, ':', 1)::integer * 60 + split_part(NEW.start_time, ':', 2)::integer;
  v_activity_end := split_part(NEW.end_time, ':', 1)::integer * 60 + split_part(NEW.end_time, ':', 2)::integer;

  CALL courses."courseActivityUpsert"(
    NEW.id,
    NEW.course_id,
    NEW.name,
    NEW.activity_type::text,
    NEW.description,
    greatest(0, v_activity_start - coalesce(v_event_start, v_activity_start)),
    greatest(1, v_activity_end - v_activity_start),
    NEW.sort_order,
    ''
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public."rollfindersActivityViewDelete"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = courses, public
AS $$
BEGIN
  CALL courses."courseActivityDelete"(OLD.id, '', 'Deleted through RollFinders compatibility view');
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER rollfinders_course_activities_view_insert
INSTEAD OF INSERT ON public.course_activities
FOR EACH ROW EXECUTE FUNCTION public."rollfindersActivityViewUpsert"();

CREATE OR REPLACE TRIGGER rollfinders_course_activities_view_update
INSTEAD OF UPDATE ON public.course_activities
FOR EACH ROW EXECUTE FUNCTION public."rollfindersActivityViewUpsert"();

CREATE OR REPLACE TRIGGER rollfinders_course_activities_view_delete
INSTEAD OF DELETE ON public.course_activities
FOR EACH ROW EXECUTE FUNCTION public."rollfindersActivityViewDelete"();
