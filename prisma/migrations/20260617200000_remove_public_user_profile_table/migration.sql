ALTER TABLE IF EXISTS "academies" DROP CONSTRAINT IF EXISTS "academies_created_by_id_fkey";
ALTER TABLE IF EXISTS "academy_invitations" DROP CONSTRAINT IF EXISTS "academy_invitations_invited_by_fkey";
ALTER TABLE IF EXISTS "academy_members" DROP CONSTRAINT IF EXISTS "academy_members_user_id_fkey";
ALTER TABLE IF EXISTS "admin_audit_logs" DROP CONSTRAINT IF EXISTS "admin_audit_logs_actor_user_id_fkey";
ALTER TABLE IF EXISTS "admin_audit_logs" DROP CONSTRAINT IF EXISTS "admin_audit_logs_target_user_id_fkey";
ALTER TABLE IF EXISTS "claim_requests" DROP CONSTRAINT IF EXISTS "claim_requests_linked_user_id_fkey";
ALTER TABLE IF EXISTS "claim_requests" DROP CONSTRAINT IF EXISTS "claim_requests_reviewed_by_id_fkey";
ALTER TABLE IF EXISTS "events" DROP CONSTRAINT IF EXISTS "events_created_by_id_fkey";
ALTER TABLE IF EXISTS "invalid_email_addresses" DROP CONSTRAINT IF EXISTS "invalid_email_addresses_user_id_fkey";
ALTER TABLE IF EXISTS "outbound_emails" DROP CONSTRAINT IF EXISTS "outbound_emails_user_id_fkey";
ALTER TABLE IF EXISTS "platform_admin_activity_events" DROP CONSTRAINT IF EXISTS "platform_admin_activity_events_actor_user_id_fkey";
ALTER TABLE IF EXISTS "platform_admin_activity_exemptions" DROP CONSTRAINT IF EXISTS "platform_admin_activity_exemptions_created_by_id_fkey";
ALTER TABLE IF EXISTS "platform_admin_activity_exemptions" DROP CONSTRAINT IF EXISTS "platform_admin_activity_exemptions_user_id_fkey";
ALTER TABLE IF EXISTS "platform_admin_profiles" DROP CONSTRAINT IF EXISTS "platform_admin_profiles_user_id_fkey";
ALTER TABLE IF EXISTS "platform_admin_weekly_targets" DROP CONSTRAINT IF EXISTS "platform_admin_weekly_targets_user_id_fkey";

DROP TABLE IF EXISTS "rollfinder_user_profiles";
