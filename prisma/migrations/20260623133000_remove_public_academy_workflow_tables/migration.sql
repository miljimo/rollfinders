-- Move remaining academy-domain workflow data out of public into the academy schema.

ALTER TABLE IF EXISTS academy.academy_claim_reminders
  ALTER COLUMN recipient_email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS actor_user_id TEXT,
  ADD COLUMN IF NOT EXISTS outbound_email_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin_academies';

DO $$
BEGIN
  IF to_regclass('public.claim_requests') IS NOT NULL THEN
    INSERT INTO academy.academy_claims (
      id,
      academy_id,
      claimant_user_id,
      claimant_email,
      status,
      evidence,
      review_notes,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at
    )
    SELECT
      c.id,
      c.academy_id,
      c.linked_user_id,
      c.requester_email,
      CASE
        WHEN c.status::TEXT = 'APPROVED' THEN 'approved'::academy.academy_claim_status
        WHEN c.status::TEXT = 'REJECTED' THEN 'rejected'::academy.academy_claim_status
        ELSE 'pending'::academy.academy_claim_status
      END,
      jsonb_build_object(
        'requesterName', c.requester_name,
        'requesterPhone', c.requester_phone,
        'requesterRole', c.requester_role::TEXT,
        'requesterBeltRank', c.requester_belt_rank::TEXT,
        'requesterBeltStripes', c.requester_belt_stripes,
        'verificationNotes', c.verification_notes,
        'publicProofLink', c.public_proof_link
      ),
      c.rejection_reason,
      c.reviewed_by_id,
      c.reviewed_at,
      c.created_at,
      COALESCE(c.reviewed_at, c.created_at)
    FROM public.claim_requests c
    WHERE EXISTS (
      SELECT 1
      FROM academy.academies a
      WHERE a.id = c.academy_id
    )
    ON CONFLICT (id) DO UPDATE SET
      academy_id = EXCLUDED.academy_id,
      claimant_user_id = EXCLUDED.claimant_user_id,
      claimant_email = EXCLUDED.claimant_email,
      status = EXCLUDED.status,
      evidence = EXCLUDED.evidence,
      review_notes = EXCLUDED.review_notes,
      reviewed_by = EXCLUDED.reviewed_by,
      reviewed_at = EXCLUDED.reviewed_at,
      updated_at = EXCLUDED.updated_at;
  END IF;

  IF to_regclass('public.academy_invitations') IS NOT NULL THEN
    INSERT INTO academy.academy_invitations (
      id,
      academy_id,
      email,
      invited_by,
      token_hash,
      status,
      expires_at,
      created_at,
      updated_at
    )
    SELECT
      i.id,
      i.academy_id,
      i.invited_email,
      i.invited_by,
      i.token,
      CASE
        WHEN i.status::TEXT = 'ACCEPTED' THEN 'accepted'::academy.academy_invitation_status
        WHEN i.status::TEXT = 'CANCELLED' THEN 'cancelled'::academy.academy_invitation_status
        WHEN i.status::TEXT = 'EXPIRED' THEN 'expired'::academy.academy_invitation_status
        ELSE 'pending'::academy.academy_invitation_status
      END,
      i.expires_at,
      i.created_at,
      i.created_at
    FROM public.academy_invitations i
    WHERE EXISTS (
      SELECT 1
      FROM academy.academies a
      WHERE a.id = i.academy_id
    )
    ON CONFLICT (id) DO UPDATE SET
      academy_id = EXCLUDED.academy_id,
      email = EXCLUDED.email,
      invited_by = EXCLUDED.invited_by,
      token_hash = EXCLUDED.token_hash,
      status = EXCLUDED.status,
      expires_at = EXCLUDED.expires_at,
      updated_at = EXCLUDED.updated_at;
  END IF;

  IF to_regclass('public.academy_claim_reminders') IS NOT NULL THEN
    INSERT INTO academy.academy_claim_reminders (
      id,
      academy_id,
      recipient_email,
      sent_by,
      actor_user_id,
      outbound_email_id,
      idempotency_key,
      status,
      skip_reason,
      source,
      sent_at,
      created_at
    )
    SELECT
      r.id,
      r.academy_id,
      r.recipient_email,
      r.actor_user_id,
      r.actor_user_id,
      r.outbound_email_id,
      r.idempotency_key,
      r.status,
      r.skip_reason,
      r.source,
      r.created_at,
      r.created_at
    FROM public.academy_claim_reminders r
    WHERE EXISTS (
      SELECT 1
      FROM academy.academies a
      WHERE a.id = r.academy_id
    )
    ON CONFLICT (id) DO UPDATE SET
      academy_id = EXCLUDED.academy_id,
      recipient_email = EXCLUDED.recipient_email,
      sent_by = EXCLUDED.sent_by,
      actor_user_id = EXCLUDED.actor_user_id,
      outbound_email_id = EXCLUDED.outbound_email_id,
      idempotency_key = EXCLUDED.idempotency_key,
      status = EXCLUDED.status,
      skip_reason = EXCLUDED.skip_reason,
      source = EXCLUDED.source,
      sent_at = EXCLUDED.sent_at,
      created_at = EXCLUDED.created_at;
  END IF;
END $$;

DROP TABLE IF EXISTS public.claim_requests;
DROP TABLE IF EXISTS public.academy_invitations;
DROP TABLE IF EXISTS public.academy_claim_reminders;
