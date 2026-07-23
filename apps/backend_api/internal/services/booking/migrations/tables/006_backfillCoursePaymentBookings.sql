DO $$
BEGIN
    IF to_regclass('payments.payments') IS NULL
       OR to_regclass('payments.checkouts') IS NULL THEN
        RETURN;
    END IF;

    WITH course_payments AS (
        SELECT
            p.id AS payment_id,
            p.status AS payment_status,
            p.amount_minor,
            p.currency,
            p.metadata AS payment_metadata,
            p.created_at,
            p.updated_at,
            c.id AS checkout_id,
            c.resource_id,
            c.resource_label,
            NULLIF(c.payer_user_id, '') AS payer_user_id,
            NULLIF(lower(c.payer_email), '') AS payer_email,
            COALESCE(NULLIF(p.metadata->>'course_id', ''), split_part(c.resource_id, ':', 1)) AS course_id,
            COALESCE(NULLIF(p.metadata->>'academy_id', ''), NULLIF(p.metadata->>'organisation_id', '')) AS academy_id,
            row_number() OVER (
                PARTITION BY
                    c.resource_id,
                    COALESCE(NULLIF(lower(c.payer_email), ''), NULLIF(c.payer_user_id, ''), p.id)
                ORDER BY p.created_at, p.id
            ) AS payer_occurrence_number
        FROM payments.payments p
        JOIN payments.checkouts c ON c.payment_id = p.id
        WHERE c.resource_type = 'course_occurrence'
          AND COALESCE(NULLIF(p.metadata->>'payment_scope', ''), 'COURSE_OCCURRENCE') = 'COURSE_OCCURRENCE'
          AND c.resource_id IS NOT NULL
          AND c.resource_id <> ''
          AND p.status IN ('succeeded', 'paid', 'completed', 'requires_action', 'pending')
    ),
    importable AS (
        SELECT
            'book_' || substr(md5('course-payment:' || payment_id), 1, 24) AS booking_id,
            'RF-' || upper(substr(md5('course-payment:' || payment_id), 1, 10)) AS booking_reference,
            course_id,
            resource_id,
            payer_user_id,
            CASE
                WHEN payer_email IS NULL THEN NULL
                WHEN payer_occurrence_number = 1 THEN payer_email
                ELSE payer_email || '#payment-' || payment_id
            END AS guest_reference,
            academy_id,
            payment_id,
            CASE
                WHEN payment_status IN ('succeeded', 'paid', 'completed') THEN 'confirmed'::booking.booking_status
                ELSE 'payment_pending'::booking.booking_status
            END AS booking_status,
            jsonb_strip_nulls(
                COALESCE(payment_metadata, '{}'::jsonb)
                || jsonb_build_object(
                    'source', 'payment_service_backfill',
                    'checkout_id', checkout_id,
                    'payment_id', payment_id,
                    'payment_status', payment_status,
                    'amount_minor', amount_minor,
                    'currency', currency,
                    'resource_label', resource_label,
                    'payer_email', payer_email,
                    'guest_reference_disambiguated', payer_occurrence_number > 1
                )
            ) AS metadata,
            created_at,
            updated_at
        FROM course_payments
        WHERE course_id IS NOT NULL
          AND course_id <> ''
          AND academy_id IS NOT NULL
          AND academy_id <> ''
          AND (payer_user_id IS NOT NULL OR payer_email IS NOT NULL)
    )
    INSERT INTO booking.bookings (
        id,
        reference,
        bookable_type,
        bookable_id,
        bookable_instance_id,
        customer_id,
        guest_reference,
        organisation_id,
        payment_id,
        status,
        participant_count,
        metadata,
        created_at,
        updated_at
    )
    SELECT
        booking_id,
        booking_reference,
        'course_occurrence',
        course_id,
        resource_id,
        payer_user_id,
        guest_reference,
        academy_id,
        payment_id,
        booking_status,
        1,
        metadata,
        created_at,
        updated_at
    FROM importable
    WHERE NOT EXISTS (
        SELECT 1
        FROM booking.bookings existing
        WHERE existing.payment_id = importable.payment_id
           OR existing.id = importable.booking_id
           OR (
               existing.bookable_type = 'course_occurrence'
               AND existing.bookable_instance_id = importable.resource_id
               AND COALESCE(existing.guest_reference, existing.customer_id) = COALESCE(importable.guest_reference, importable.payer_user_id)
               AND existing.status IN ('pending', 'payment_pending', 'payment_received', 'confirmed')
           )
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO booking.booking_participants (
        id,
        booking_id,
        customer_id,
        guest_reference,
        display_name,
        participant_status,
        attendance_status,
        metadata,
        created_at,
        updated_at
    )
    SELECT
        'part_' || substr(md5('course-payment:' || b.payment_id), 1, 24),
        b.id,
        b.customer_id,
        b.guest_reference,
        COALESCE(NULLIF(b.metadata->>'payer_email', ''), NULLIF(b.metadata->>'payer_user_id', ''), 'Legacy paid attendee'),
        'active',
        'unknown',
        jsonb_build_object('source', 'payment_service_backfill', 'payment_id', b.payment_id),
        b.created_at,
        b.updated_at
    FROM booking.bookings b
    WHERE b.bookable_type = 'course_occurrence'
      AND b.payment_id IS NOT NULL
      AND b.metadata->>'source' = 'payment_service_backfill'
      AND NOT EXISTS (
          SELECT 1
          FROM booking.booking_participants existing
          WHERE existing.booking_id = b.id
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO booking.booking_status_history (
        id,
        booking_id,
        from_status,
        to_status,
        reason,
        changed_by,
        metadata,
        created_at
    )
    SELECT
        'hist_' || substr(md5('course-payment-created:' || b.id), 1, 24),
        b.id,
        NULL,
        b.status,
        'payment_service_backfill_created',
        'system',
        jsonb_build_object('source', 'payment_service_backfill', 'payment_id', b.payment_id),
        b.created_at
    FROM booking.bookings b
    WHERE b.bookable_type = 'course_occurrence'
      AND b.payment_id IS NOT NULL
      AND b.metadata->>'source' = 'payment_service_backfill'
      AND NOT EXISTS (
          SELECT 1
          FROM booking.booking_status_history existing
          WHERE existing.id = 'hist_' || substr(md5('course-payment-created:' || b.id), 1, 24)
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO booking.booking_status_history (
        id,
        booking_id,
        from_status,
        to_status,
        reason,
        changed_by,
        metadata,
        created_at
    )
    SELECT
        'hist_' || substr(md5('course-payment-received:' || b.id), 1, 24),
        b.id,
        'payment_pending',
        b.status,
        'payment_service_backfill_payment_received',
        'system',
        jsonb_build_object(
            'source', 'payment_service_backfill',
            'payment_id', b.payment_id,
            'payment_status', b.metadata->>'payment_status'
        ),
        b.created_at
    FROM booking.bookings b
    WHERE b.bookable_type = 'course_occurrence'
      AND b.payment_id IS NOT NULL
      AND b.status IN ('payment_received', 'confirmed')
      AND b.metadata->>'source' = 'payment_service_backfill'
      AND NOT EXISTS (
          SELECT 1
          FROM booking.booking_status_history existing
          WHERE existing.id = 'hist_' || substr(md5('course-payment-received:' || b.id), 1, 24)
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO booking.outbox_events (
        id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        status,
        created_at,
        updated_at
    )
    SELECT
        'outbox_' || substr(md5('course-payment-booking-created:' || b.id), 1, 24),
        'booking',
        b.id,
        'booking.created',
        jsonb_build_object(
            'booking_id', b.id,
            'payment_id', b.payment_id,
            'status', b.status::text,
            'source', 'payment_service_backfill'
        ),
        'published',
        b.created_at,
        b.updated_at
    FROM booking.bookings b
    WHERE b.bookable_type = 'course_occurrence'
      AND b.payment_id IS NOT NULL
      AND b.metadata->>'source' = 'payment_service_backfill'
    ON CONFLICT (id) DO NOTHING;
END $$;
