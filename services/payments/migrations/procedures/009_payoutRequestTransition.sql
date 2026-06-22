CREATE OR REPLACE PROCEDURE "payoutRequestTransition"(
    p_id text,
    p_next_status text,
    p_actor_id text,
    p_provider_reference text,
    p_reason text,
    p_notes text
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
DECLARE
    v_current_status text;
    v_allowed boolean;
BEGIN
    SELECT status INTO v_current_status
    FROM payout_requests
    WHERE id = p_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'payout_request_not_found';
    END IF;

    v_allowed := CASE
        WHEN v_current_status = p_next_status THEN true
        WHEN v_current_status = 'pending_review' AND p_next_status IN ('approved', 'held', 'rejected', 'cancelled') THEN true
        WHEN v_current_status = 'held' AND p_next_status IN ('pending_review', 'approved', 'rejected') THEN true
        WHEN v_current_status = 'approved' AND p_next_status IN ('processing', 'paid', 'held', 'failed') THEN true
        WHEN v_current_status = 'processing' AND p_next_status IN ('paid', 'failed') THEN true
        WHEN v_current_status = 'failed' AND p_next_status IN ('approved', 'cancelled') THEN true
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'payout_request_invalid_state';
    END IF;

    UPDATE payout_requests
    SET status = p_next_status,
        actor_id = COALESCE(p_actor_id, actor_id),
        provider_reference = COALESCE(p_provider_reference, provider_reference),
        reason = COALESCE(p_reason, reason),
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = p_id;

    IF p_next_status IN ('rejected', 'cancelled') THEN
        UPDATE payout_request_entries
        SET status = 'released',
            updated_at = now()
        WHERE payout_request_id = p_id
          AND status = 'reserved';
    ELSIF p_next_status = 'paid' THEN
        UPDATE payout_request_entries
        SET status = 'settled',
            updated_at = now()
        WHERE payout_request_id = p_id
          AND status = 'reserved';
    END IF;

    INSERT INTO payout_request_status_history (payout_request_id, from_status, to_status, actor_id, reason, notes)
    VALUES (p_id, v_current_status, p_next_status, p_actor_id, p_reason, p_notes);

    INSERT INTO payout_request_audit_events (id, payout_request_id, event_type, actor_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        p_id,
        'payout_request.' || p_next_status,
        p_actor_id,
        jsonb_build_object('from_status', v_current_status, 'to_status', p_next_status, 'reason', p_reason, 'provider_reference', p_provider_reference)
    );

    INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
    VALUES (
        'evt_' || replace(gen_random_uuid()::text, '-', ''),
        'payout_request.' || p_next_status,
        p_id,
        jsonb_build_object('payout_request_id', p_id, 'from_status', v_current_status, 'status', p_next_status)
    );
END;
$$;
