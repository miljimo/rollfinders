DO $$
DECLARE
    metric record;
BEGIN
    IF to_regclass('analytics.events') IS NULL
       OR to_regclass('analytics.daily_metrics') IS NULL THEN
        RETURN;
    END IF;

    FOR metric IN
        SELECT * FROM (
            VALUES
                ('unique_visitors', 'COUNT(DISTINCT visitor_id)', 'visitor_id IS NOT NULL'),
                ('unique_sessions', 'COUNT(DISTINCT session_id)', 'session_id IS NOT NULL'),
                ('academy_searches', 'COUNT(*)', 'event_name = ''academy_search_submitted'''),
                ('open_mat_searches', 'COUNT(*)', 'event_name = ''open_mat_search_submitted'''),
                ('course_searches', 'COUNT(*)', 'event_name = ''course_search_submitted'''),
                ('academy_profile_views', 'COUNT(*)', 'event_name = ''academy_profile_viewed'''),
                ('open_mat_views', 'COUNT(*)', 'event_name = ''open_mat_viewed'''),
                ('course_views', 'COUNT(*)', 'event_name = ''course_viewed'''),
                ('commercial_intent_clicks', 'COUNT(*)', 'event_name = ''commercial_intent_clicked'''),
                ('claim_starts', 'COUNT(*)', 'event_name = ''claim_profile_started'''),
                ('claim_submissions', 'COUNT(*)', 'event_name = ''claim_profile_submitted'''),
                ('claims_approved', 'COUNT(*)', 'event_name = ''claim_approved'''),
                ('claims_rejected', 'COUNT(*)', 'event_name = ''claim_rejected'''),
                ('user_logins', 'COUNT(*)', 'event_name = ''user_logged_in'''),
                ('logged_in_users', 'COUNT(DISTINCT COALESCE(NULLIF(metadata->>''userId'', ''''), NULLIF(visitor_id, ''''), NULLIF(session_id, '''')))', 'event_name = ''user_logged_in'''),
                ('academies_created', 'COUNT(*)', 'event_name = ''academy_created'''),
                ('open_mats_created', 'COUNT(*)', 'event_name = ''open_mat_created'''),
                ('courses_created', 'COUNT(*)', 'event_name = ''course_created'''),
                ('recurring_courses_created', 'COUNT(*)', 'event_name = ''recurring_course_created''')
        ) AS metrics(metric_name, aggregate_expression, predicate)
    LOOP
        EXECUTE format(
            $sql$
            INSERT INTO analytics.daily_metrics (
                id,
                metric_date,
                metric_name,
                source,
                dimension_key,
                dimensions,
                value,
                created_at,
                updated_at
            )
            SELECT
                'dm_' || substr(md5(%L || ':' || created_at::date::text || ':global'), 1, 24),
                created_at::date,
                %L,
                'migration_backfill',
                'global',
                '{}'::jsonb,
                COALESCE(%s, 0)::integer,
                now(),
                now()
            FROM analytics.events
            WHERE %s
            GROUP BY created_at::date
            ON CONFLICT (metric_date, metric_name, dimension_key)
            DO UPDATE SET
                value = EXCLUDED.value,
                source = EXCLUDED.source,
                updated_at = now()
            $sql$,
            metric.metric_name,
            metric.metric_name,
            metric.aggregate_expression,
            metric.predicate
        );
    END LOOP;
END $$;
