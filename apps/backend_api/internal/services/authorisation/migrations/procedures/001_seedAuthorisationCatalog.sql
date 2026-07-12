CREATE OR REPLACE PROCEDURE "seedAuthorisationCatalog"()
LANGUAGE plpgsql
SET search_path TO authorisation, public
AS $$
BEGIN
    ALTER TABLE permissions
        ADD COLUMN IF NOT EXISTS organisation_id text;

    ALTER TABLE permissions
        ADD COLUMN IF NOT EXISTS application_id text;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'permissions'
          AND column_name = 'code'
    ) THEN
        ALTER TABLE permissions
            ALTER COLUMN code DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'permissions'
          AND column_name = 'name'
    ) THEN
        ALTER TABLE permissions
            ALTER COLUMN name DROP NOT NULL;
    END IF;

    ALTER TABLE permissions
        DROP CONSTRAINT IF EXISTS permissions_code_key;

    ALTER TABLE permissions
        DROP CONSTRAINT IF EXISTS permissions_code_scope_key;

    ALTER TABLE permissions
        DROP CONSTRAINT IF EXISTS permissions_resource_scope_key;

    ALTER TABLE role_permissions
        DROP CONSTRAINT IF EXISTS role_permissions_pkey;

    DROP INDEX IF EXISTS user_permissions_user_permission_scope_key;

    WITH ranked AS (
        SELECT
            id,
            FIRST_VALUE(id) OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS keep_id,
            ROW_NUMBER() OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS row_number
        FROM permissions
    )
    DELETE FROM role_permissions rp
    USING ranked
    WHERE rp.permission_id = ranked.id
      AND ranked.row_number > 1
      AND EXISTS (
          SELECT 1
          FROM role_permissions kept
          WHERE kept.role_id = rp.role_id
            AND kept.permission_id = ranked.keep_id
      );

    WITH ranked AS (
        SELECT
            id,
            FIRST_VALUE(id) OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS keep_id,
            ROW_NUMBER() OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS row_number
        FROM permissions
    )
    UPDATE role_permissions rp
    SET permission_id = ranked.keep_id
    FROM ranked
    WHERE rp.permission_id = ranked.id
      AND ranked.row_number > 1;

    WITH ranked AS (
        SELECT
            id,
            FIRST_VALUE(id) OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS keep_id,
            ROW_NUMBER() OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS row_number
        FROM permissions
    )
    UPDATE user_permissions up
    SET permission_id = ranked.keep_id
    FROM ranked
    WHERE up.permission_id = ranked.id
      AND ranked.row_number > 1;

    DELETE FROM user_permissions up
    USING user_permissions duplicate
    WHERE up.ctid < duplicate.ctid
      AND up.user_id = duplicate.user_id
      AND up.permission_id = duplicate.permission_id
      AND COALESCE(up.organisation_id, '') = COALESCE(duplicate.organisation_id, '')
      AND COALESCE(up.application_id, '') = COALESCE(duplicate.application_id, '')
      AND COALESCE(up.resource_id, '') = COALESCE(duplicate.resource_id, '');

    DELETE FROM role_permissions rp
    USING role_permissions duplicate
    WHERE rp.ctid < duplicate.ctid
      AND rp.role_id = duplicate.role_id
      AND rp.permission_id = duplicate.permission_id;

    ALTER TABLE role_permissions
        ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

    CREATE UNIQUE INDEX IF NOT EXISTS user_permissions_user_permission_scope_key ON user_permissions (
        user_id,
        permission_id,
        COALESCE(organisation_id, ''),
        COALESCE(application_id, ''),
        COALESCE(resource_id, '')
    );

    WITH ranked AS (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY resource_id, organisation_id, application_id
                ORDER BY created_at, id
            ) AS row_number
        FROM permissions
    )
    DELETE FROM permissions p
    USING ranked
    WHERE p.id = ranked.id
      AND ranked.row_number > 1;

    ALTER TABLE permissions
        ADD CONSTRAINT permissions_resource_scope_key
        UNIQUE NULLS NOT DISTINCT (resource_id, organisation_id, application_id);

    CREATE INDEX IF NOT EXISTS permissions_scope_idx ON permissions (organisation_id, application_id);

    ALTER TABLE role_permissions
        DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;

    ALTER TABLE role_permissions
        ADD CONSTRAINT role_permissions_permission_id_fkey
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON UPDATE CASCADE ON DELETE CASCADE;

    ALTER TABLE user_permissions
        DROP CONSTRAINT IF EXISTS user_permissions_permission_id_fkey;

    ALTER TABLE user_permissions
        ADD CONSTRAINT user_permissions_permission_id_fkey
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON UPDATE CASCADE ON DELETE CASCADE;

    CREATE TEMP TABLE IF NOT EXISTS permissionIdRewrites (
        old_id text PRIMARY KEY,
        new_id text NOT NULL UNIQUE
    ) ON COMMIT DROP;

    TRUNCATE permissionIdRewrites;

    INSERT INTO permissionIdRewrites (old_id, new_id)
    SELECT id, 'permission_' || encode(gen_random_bytes(12), 'hex')
    FROM permissions
    WHERE id LIKE 'perm\_%' ESCAPE '\';

    UPDATE permissions p
    SET id = rewrites.new_id,
        updated_at = now()
    FROM permissionIdRewrites rewrites
    WHERE p.id = rewrites.old_id;

    WITH permissionSeed(code, name, description) AS (
    VALUES
        ('academy.create', 'Create academies', 'Allows creating academy resources.'),
        ('academy.view', 'View academies', 'Allows viewing academy records and public/admin profile details.'),
        ('academy.read', 'Read academies', 'Allows reading academy management data.'),
        ('academy.edit', 'Edit academies', 'Allows editing academy records and profile fields.'),
        ('academy.update', 'Update academies', 'Allows updating academy resources.'),
        ('academy.delete', 'Delete academies', 'Allows deleting academy resources.'),
        ('academy.claim.view', 'View academy claim workflow', 'Allows viewing academy ownership claim workflow access.'),
        ('academy.claim.approve', 'Approve academy claims', 'Allows approving academy ownership claims.'),
        ('academy.verify', 'Verify academies', 'Allows verifying academy records.'),
        ('academy.unverify', 'Unverify academies', 'Allows removing academy verification.'),
        ('academy.suspend', 'Suspend academies', 'Allows suspending academy management or public visibility.'),
        ('academy.activate', 'Activate academies', 'Allows reactivating suspended academy records.'),
        ('academy.archive', 'Archive academies', 'Allows archiving academy records.'),
        ('academy.restore', 'Restore academies', 'Allows restoring archived academy records.'),
        ('academy.audit.view', 'View academy audit', 'Allows viewing academy audit history.'),
        ('academy.public.enabled', 'Enable public academy listing', 'Allows enabling academy public listing and discovery visibility.'),
        ('academy.search', 'Search academies', 'Allows listing and searching academy resources.'),
        ('academy.member.read', 'Read academy members', 'Allows reading academy member records.'),
        ('academy.member.add', 'Add academy members', 'Allows adding users to academy membership.'),
        ('academy.member.assign', 'Assign academy members', 'Allows assigning users to academy membership.'),
        ('academy.member.remove', 'Remove academy members', 'Allows removing users from academy membership.'),
        ('academy.membership.read', 'Read academy memberships', 'Allows reading academy memberships for the current user or scope.'),
        ('academy.profile.read', 'Read academy profile', 'Allows reading editable academy profile data.'),
        ('academy.profile.update', 'Update academy profile', 'Allows updating academy profile data.'),
        ('academy.social.read', 'Read academy social links', 'Allows reading academy social links.'),
        ('academy.social.update', 'Update academy social links', 'Allows creating, updating, or removing academy social links.'),
        ('course.create', 'Create courses', 'Allows creating courses and events.'),
        ('course.read', 'Read courses', 'Allows reading course and event records.'),
        ('course.search', 'Search courses', 'Allows listing and searching courses and events.'),
        ('course.update', 'Update courses', 'Allows updating courses and events.'),
        ('course.delete', 'Delete courses', 'Allows deleting courses and events.'),
        ('course.activity.create', 'Create course activities', 'Allows creating activities for a course or event.'),
        ('course.activity.read', 'Read course activities', 'Allows reading course activity records.'),
        ('course.activity.update', 'Update course activities', 'Allows updating course activity records.'),
        ('course.activity.delete', 'Delete course activities', 'Allows deleting course activity records.'),
        ('course.type.create', 'Create course types', 'Allows creating course type definitions.'),
        ('course.type.read', 'Read course types', 'Allows reading course type definitions.'),
        ('course.type.update', 'Update course types', 'Allows updating course type definitions.'),
        ('course.type.delete', 'Delete course types', 'Allows deleting course type definitions.'),
        ('booking.create', 'Create bookings', 'Allows creating booking records.'),
        ('booking.read', 'Read bookings', 'Allows reading booking records.'),
        ('booking.view', 'View bookings', 'Allows viewing bookings.'),
        ('booking.cancel', 'Cancel bookings', 'Allows cancelling bookings.'),
        ('booking.confirm', 'Confirm bookings', 'Allows confirming bookings.'),
        ('booking.complete', 'Complete bookings', 'Allows marking bookings as complete.'),
        ('booking.payment_received', 'Record booking payment received', 'Allows marking booking payment as received.'),
        ('booking.payment_link', 'Create booking payment links', 'Allows creating payment links for bookings.'),
        ('booking.participant.create', 'Create booking participants', 'Allows adding participants to bookings.'),
        ('booking.participant.read', 'Read booking participants', 'Allows reading booking participant records.'),
        ('booking.participant.attendance.record', 'Record booking attendance', 'Allows recording participant attendance for bookings.'),
        ('payment.client.create', 'Create payment clients', 'Allows creating payment client records.'),
        ('payment.checkout.create', 'Create payment checkouts', 'Allows creating checkout sessions.'),
        ('payment.checkout.callback', 'Handle payment checkout callbacks', 'Allows handling checkout result callbacks.'),
        ('payment.subscription.create', 'Create payment billing subscriptions', 'Allows creating provider billing subscriptions and subscription checkout sessions.'),
        ('payment.subscription.read', 'Read payment billing subscriptions', 'Allows reading provider billing subscriptions, invoices, and recurring payment history.'),
        ('payment.subscription.manage', 'Manage payment billing subscriptions', 'Allows cancelling or resuming provider billing subscriptions.'),
        ('payment.course_occurrence_checkout.create', 'Create course occurrence checkouts', 'Allows creating course occurrence checkout sessions.'),
        ('payment.course_occurrence_checkout.callback', 'Handle course occurrence checkout callbacks', 'Allows handling course occurrence checkout result callbacks.'),
        ('payment.create', 'Create payments', 'Allows creating payment records.'),
        ('payment.read', 'Read payments', 'Allows reading payment records.'),
        ('payment.search', 'Search payments', 'Allows listing payment records in scope.'),
        ('payment.capture', 'Capture payments', 'Allows capturing authorised payments.'),
        ('payment.cancel', 'Cancel payments', 'Allows cancelling payments.'),
        ('payment.report.revenue.read', 'Read payment revenue reports', 'Allows reading gross payment revenue metrics in scope.'),
        ('payment.report.refund.read', 'Read payment refund reports', 'Allows reading payment refund metrics in scope.'),
        ('payment.report.platform_revenue.read', 'Read platform payment revenue reports', 'Allows reading platform commission and platform revenue metrics.'),
        ('payment.refund', 'Refund payments', 'Allows creating payment refunds.'),
        ('payment.refund.read', 'Read payment refunds', 'Allows reading payment refund records.'),
        ('payment.payee.balance.read', 'Read payee balances', 'Allows reading payee balance records.'),
        ('payment.webhook.receive', 'Receive payment webhooks', 'Allows receiving payment provider webhooks.'),
        ('payment.outbox.dispatch', 'Dispatch payment outbox', 'Allows dispatching payment service outbox events.'),
        ('payout.request.create', 'Create payout requests', 'Allows creating payout requests.'),
        ('payout.request.read', 'Read payout requests', 'Allows reading payout request records.'),
        ('payout.request.approve', 'Approve payout requests', 'Allows approving payout requests.'),
        ('payout.request.reject', 'Reject payout requests', 'Allows rejecting payout requests.'),
        ('payout.request.hold', 'Hold payout requests', 'Allows placing payout requests on hold.'),
        ('payout.request.release', 'Release payout requests', 'Allows releasing payout requests from hold.'),
        ('payout.request.mark_paid', 'Mark payout requests paid', 'Allows marking payout requests as paid.'),
        ('payout.request.cancel', 'Cancel payout requests', 'Allows cancelling payout requests.'),
        ('auth.register', 'Register users', 'Allows registering user identities.'),
        ('auth.login', 'Login users', 'Allows authenticating user identities.'),
        ('auth.logout', 'Logout users', 'Allows ending authenticated sessions.'),
        ('auth.refresh', 'Refresh sessions', 'Allows refreshing authenticated sessions.'),
        ('auth.password.change', 'Change password', 'Allows changing the authenticated user password.'),
        ('auth.password_reset.request', 'Request password reset', 'Allows requesting a password reset flow.'),
        ('auth.password_reset.validate', 'Validate password reset', 'Allows validating a password reset token.'),
        ('auth.password_reset.confirm', 'Confirm password reset', 'Allows confirming a password reset.'),
        ('auth.session.read', 'Read sessions', 'Allows reading authenticated sessions.'),
        ('auth.session.revoke', 'Revoke sessions', 'Allows revoking authenticated sessions.'),
        ('auth.mfa.setup', 'Set up MFA', 'Allows starting MFA setup.'),
        ('auth.mfa.verify', 'Verify MFA', 'Allows verifying MFA challenges.'),
        ('auth.credentials.authenticate', 'Authenticate credentials', 'Allows validating credentials through internal authentication APIs.'),
        ('account.read', 'Read accounts', 'Allows reading user account records.'),
        ('user.create', 'Create users', 'Allows creating users.'),
        ('user.read', 'Read users', 'Allows reading user administration data.'),
        ('user.update', 'Update users', 'Allows updating managed users.'),
        ('user.delete', 'Delete users', 'Allows deleting users.'),
        ('user.mutate', 'Run user mutations', 'Allows running named user mutation actions.'),
        ('organisation.create', 'Create organisations', 'Allows creating organisation records.'),
        ('organisation.read', 'Read organisations', 'Allows reading organisation records.'),
        ('organisation.update', 'Update organisations', 'Allows updating organisation records.'),
        ('organisation.application.manage', 'Manage organisation applications', 'Allows managing application enablement.'),
        ('subscription.product.read', 'Read subscription products', 'Allows reading subscription products and product features.'),
        ('subscription.product.manage', 'Manage subscription products', 'Allows creating and updating subscription products and product features.'),
        ('subscription.plan.read', 'Read subscription plans', 'Allows reading subscription plan catalogue data.'),
        ('subscription.plan.manage', 'Manage subscription plans', 'Allows creating plans and selecting included subscription features.'),
        ('subscription.available_features.read', 'Read available subscription features', 'Allows reading application service features available for plans.'),
        ('subscription.subscription.read', 'Read subscriptions', 'Allows reading organisation and application subscriptions.'),
        ('subscription.subscription.manage', 'Manage subscriptions', 'Allows creating, cancelling, and changing subscription plans.'),
        ('subscription.entitlement.read', 'Read subscription entitlements', 'Allows reading active subscription entitlements.'),
        ('wallet.create', 'Create wallets', 'Allows creating internal platform wallets.'),
        ('wallet.search', 'Search wallets', 'Allows listing and searching internal platform wallets.'),
        ('wallet.read', 'Read wallets', 'Allows reading internal platform wallet records and balances.'),
        ('wallet.transfer', 'Create wallet transfers', 'Allows creating wallet ledger transfers.'),
        ('wallet.reverse', 'Reverse wallet transactions', 'Allows reversing wallet ledger transactions.'),
        ('wallet.adjustment', 'Create wallet adjustments', 'Allows creating manual wallet ledger adjustments.'),
        ('wallet.transaction.read', 'Read wallet transactions', 'Allows reading wallet ledger transactions.'),
        ('usage_limit.read', 'Read usage limits', 'Allows reading usage limit summaries and audit events.'),
        ('usage_limit.manage', 'Manage usage limits', 'Allows managing usage limit rules, reservations, and counters.'),
        ('authorisation.permission.create', 'Create permissions', 'Allows creating permission definitions.'),
        ('authorisation.permission.read', 'Read permissions', 'Allows reading permission definitions.'),
        ('authorisation.permission.search', 'Search permissions', 'Allows listing and searching permission definitions.'),
        ('authorisation.permission.update', 'Update permissions', 'Allows updating permission definitions.'),
        ('authorisation.role.create', 'Create roles', 'Allows creating role bundles.'),
        ('authorisation.role.read', 'Read roles', 'Allows reading role bundles.'),
        ('authorisation.role.search', 'Search roles', 'Allows listing and searching role bundles.'),
        ('authorisation.role.update', 'Update roles', 'Allows updating role bundles.'),
        ('authorisation.role_permission.add', 'Add role permissions', 'Allows adding permissions to role bundles.'),
        ('authorisation.role_permission.assign', 'Assign role permissions', 'Allows assigning permissions to role bundles.'),
        ('authorisation.role_permission.read', 'Read role permissions', 'Allows reading role-permission mappings.'),
        ('authorisation.role_permission.remove', 'Remove role permissions', 'Allows removing permissions from role bundles.'),
        ('authorisation.user_role.assign', 'Assign user roles', 'Allows assigning roles to users.'),
        ('authorisation.user_role.read', 'Read user roles', 'Allows reading user role assignments.'),
        ('authorisation.user_role.remove', 'Remove user roles', 'Allows removing user role assignments.'),
        ('authorisation.user_permission.assign', 'Assign user permissions', 'Allows assigning direct user permissions.'),
        ('authorisation.user_permission.read', 'Read user permissions', 'Allows reading direct user permission assignments.'),
        ('authorisation.user_permission.remove', 'Remove user permissions', 'Allows removing direct user permission assignments.'),
        ('authorisation.effective_permission.read', 'Read effective permissions', 'Allows reading effective permissions for a user.'),
        ('authorisation.authorize', 'Evaluate authorisation', 'Allows calling the authorisation decision endpoint.'),
        ('academy.publish', 'Publish academies', 'Allows publishing academy records to marketplace surfaces.'),
        ('academy.unpublish', 'Unpublish academies', 'Allows removing academy records from marketplace surfaces.'),
        ('academy.profile.location.update', 'Update academy profile location', 'Allows updating academy address and geocoding profile fields.'),
        ('academy.profile.media.update', 'Update academy profile media', 'Allows updating academy profile media.'),
        ('academy.profile.contact.update', 'Update academy profile contact', 'Allows updating academy profile contact details.'),
        ('academy.profile.settings.update', 'Update academy profile settings', 'Allows updating academy profile settings.'),
        ('academy.member.update', 'Update academy members', 'Allows updating academy member role or status.'),
        ('academy.member.owner.assign', 'Assign academy owners', 'Allows assigning academy owner membership.'),
        ('academy.member.owner.transfer', 'Transfer academy ownership', 'Allows transferring academy ownership.'),
        ('academy.member.owner.remove', 'Remove academy owners', 'Allows removing academy owner membership.'),
        ('academy.member.admin.assign', 'Assign academy admins', 'Allows assigning academy admin membership.'),
        ('academy.member.admin.remove', 'Remove academy admins', 'Allows removing academy admin membership.'),
        ('academy.member.coach.assign', 'Assign academy coaches', 'Allows assigning academy coach membership.'),
        ('academy.member.coach.remove', 'Remove academy coaches', 'Allows removing academy coach membership.'),
        ('academy.claim.submit', 'Submit academy claims', 'Allows submitting academy ownership claims.'),
        ('academy.claim.read', 'Read academy claims', 'Allows reading academy ownership claim records.'),
        ('academy.claim.search', 'Search academy claims', 'Allows listing and searching academy ownership claims.'),
        ('academy.claim.update', 'Update academy claims', 'Allows updating academy ownership claim metadata.'),
        ('academy.claim.reject', 'Reject academy claims', 'Allows rejecting academy ownership claims.'),
        ('academy.claim.cancel', 'Cancel academy claims', 'Allows cancelling academy ownership claims.'),
        ('academy.claim.audit.read', 'Read academy claim audit', 'Allows reading academy claim audit records.'),
        ('academy.verification.submit', 'Submit academy verification', 'Allows submitting academy verification material.'),
        ('academy.verification.read', 'Read academy verification', 'Allows reading academy verification records.'),
        ('academy.verification.update', 'Update academy verification', 'Allows updating academy verification records.'),
        ('academy.verification.review', 'Review academy verification', 'Allows reviewing academy verification material.'),
        ('academy.verification.approve', 'Approve academy verification', 'Allows approving academy verification.'),
        ('academy.verification.reject', 'Reject academy verification', 'Allows rejecting academy verification.'),
        ('academy.verification.audit.read', 'Read academy verification audit', 'Allows reading academy verification audit records.'),
        ('academy.invitation.create', 'Create academy invitations', 'Allows creating academy invitations.'),
        ('academy.invitation.read', 'Read academy invitations', 'Allows reading academy invitations.'),
        ('academy.invitation.cancel', 'Cancel academy invitations', 'Allows cancelling academy invitations.'),
        ('academy.invitation.resend', 'Resend academy invitations', 'Allows resending academy invitations.'),
        ('academy.invitation.accept', 'Accept academy invitations', 'Allows accepting academy invitations.'),
        ('academy.invitation.expire', 'Expire academy invitations', 'Allows expiring academy invitations.'),
        ('academy.claim_reminder.create', 'Create academy claim reminders', 'Allows sending or queueing academy claim reminders.'),
        ('academy.claim_reminder.read', 'Read academy claim reminders', 'Allows reading academy claim reminder records.'),
        ('academy.claim_reminder.audit.read', 'Read academy claim reminder audit', 'Allows reading academy claim reminder audit records.'),
        ('academy.analytics.read', 'Read academy analytics', 'Allows reading academy analytics.'),
        ('academy.audit.read', 'Read academy audit logs', 'Allows reading academy domain audit logs.'),
        ('academy.payment_status.read', 'Read academy payment status', 'Allows reading academy payment capability summaries.'),
        ('academy.payment_onboarding.start', 'Start academy payment onboarding', 'Allows starting academy payment onboarding.'),
        ('academy.payment_onboarding.refresh', 'Refresh academy payment onboarding', 'Allows refreshing academy payment onboarding status or links.'),
        ('academy.payment_onboarding.disconnect', 'Disconnect academy payment onboarding', 'Allows requesting academy payment account disconnect flows.'),
        ('payment.client.read', 'Read payment clients', 'Allows reading payment client records.'),
        ('payment.client.update', 'Update payment clients', 'Allows updating payment client records.'),
        ('payment.allocation.read', 'Read payment allocations', 'Allows reading payment allocation records.'),
        ('payment.allocation.search', 'Search payment allocations', 'Allows listing and searching payment allocation records.'),
        ('payment.payee.create', 'Create payees', 'Allows creating payment payee records.'),
        ('payment.payee.read', 'Read payees', 'Allows reading payment payee records.'),
        ('payment.payee.search', 'Search payees', 'Allows listing and searching payment payee records.'),
        ('payment.payee.update', 'Update payees', 'Allows updating payment payee records.'),
        ('payment.payee.archive', 'Archive payees', 'Allows archiving payment payee records.'),
        ('payment.payee_account.create', 'Create payee accounts', 'Allows creating payment payee account records.'),
        ('payment.payee_account.read', 'Read payee accounts', 'Allows reading payment payee account records.'),
        ('payment.payee_account.update', 'Update payee accounts', 'Allows updating payment payee account records.'),
        ('payment.payee_account.disconnect', 'Disconnect payee accounts', 'Allows disconnecting payment payee accounts.'),
        ('payment.payee_account.onboarding.start', 'Start payee account onboarding', 'Allows starting payee account onboarding.'),
        ('payment.payee_account.refresh', 'Refresh payee accounts', 'Allows refreshing payment payee account status or links.'),
        ('payment.account.read', 'Read payment accounts', 'Allows reading Stripe payment account settings.'),
        ('payment.account.connect', 'Connect payment accounts', 'Allows creating or refreshing Stripe Connect payment accounts.'),
        ('payment.account.disconnect', 'Disconnect payment accounts', 'Allows disconnecting Stripe payment accounts.'),
        ('payment.commission_policy.create', 'Create commission policies', 'Allows creating payment commission policies.'),
        ('payment.commission_policy.read', 'Read commission policies', 'Allows reading payment commission policies.'),
        ('payment.commission_policy.search', 'Search commission policies', 'Allows listing and searching payment commission policies.'),
        ('payment.commission_policy.update', 'Update commission policies', 'Allows updating payment commission policies.'),
        ('payment.commission_policy.archive', 'Archive commission policies', 'Allows archiving payment commission policies.'),
        ('payment.refund.create', 'Create payment refunds', 'Allows creating payment refund records.'),
        ('payment.refund.search', 'Search payment refunds', 'Allows listing and searching payment refund records.'),
        ('payment.refund.reconcile', 'Reconcile payment refunds', 'Allows reconciling payment refund records.'),
        ('payment.settlement.search', 'Search settlements', 'Allows listing and searching payment settlements.'),
        ('payment.settlement.read', 'Read settlements', 'Allows reading payment settlement records.'),
        ('payment.settlement.hold', 'Hold settlements', 'Allows placing payment settlements on hold.'),
        ('payment.settlement.release', 'Release settlements', 'Allows releasing payment settlements from hold.'),
        ('payment.report.settlement.read', 'Read settlement reports', 'Allows reading payment settlement reports.'),
        ('payment.webhook.ingest', 'Ingest payment webhooks', 'Allows ingesting payment provider webhooks.'),
        ('payment.reconciliation.run', 'Run payment reconciliation', 'Allows running payment reconciliation jobs.'),
        ('payment.reconciliation.read', 'Read payment reconciliation', 'Allows reading payment reconciliation results.'),
        ('payment.audit.read', 'Read payment audit', 'Allows reading payment audit records.'),
        ('payment.payout_request.create', 'Create payment payout requests', 'Allows creating payout requests through payment APIs.'),
        ('payment.payout_request.read', 'Read payment payout requests', 'Allows reading payout requests through payment APIs.'),
        ('payment.payout_request.search', 'Search payment payout requests', 'Allows listing and searching payout requests through payment APIs.'),
        ('payment.payout_request.approve', 'Approve payment payout requests', 'Allows approving payout requests through payment APIs.'),
        ('payment.payout_request.reject', 'Reject payment payout requests', 'Allows rejecting payout requests through payment APIs.'),
        ('payment.payout_request.hold', 'Hold payment payout requests', 'Allows placing payout requests on hold through payment APIs.'),
        ('payment.payout_request.release', 'Release payment payout requests', 'Allows releasing payout requests through payment APIs.'),
        ('payment.payout_request.mark_paid', 'Mark payment payout requests paid', 'Allows marking payout requests as paid through payment APIs.'),
        ('payment.payout_request.cancel', 'Cancel payment payout requests', 'Allows cancelling payout requests through payment APIs.'),
        ('user.search', 'Search users', 'Allows listing and searching managed users.'),
        ('user.status.disable', 'Disable users', 'Allows disabling managed users.'),
        ('user.status.enable', 'Enable users', 'Allows enabling managed users.'),
        ('user.protected.manage', 'Manage protected users', 'Allows managing protected user records.'),
        ('user.audit.read', 'Read user audit', 'Allows reading user audit records.'),
        ('user.password.change.self', 'Change own user password', 'Allows changing the authenticated user password.'),
        ('user.password.reset.request', 'Request user password reset', 'Allows requesting a user password reset.'),
        ('user.password.reset.confirm', 'Confirm user password reset', 'Allows confirming a user password reset.'),
        ('user.password.reset.send_managed', 'Send managed user password reset', 'Allows sending managed user password reset flows.'),
        ('user.session.read', 'Read user sessions', 'Allows reading user session records.'),
        ('user.session.revoke', 'Revoke user sessions', 'Allows revoking user sessions.'),
        ('user.mfa.read', 'Read user MFA', 'Allows reading user MFA state.'),
        ('user.mfa.setup', 'Set up user MFA', 'Allows setting up user MFA.'),
        ('user.mfa.verify', 'Verify user MFA', 'Allows verifying user MFA.'),
        ('user.mfa.disable', 'Disable user MFA', 'Allows disabling user MFA.'),
        ('organisation.search', 'Search organisations', 'Allows listing and searching organisation records.'),
        ('organisation.delete', 'Delete organisations', 'Allows deleting organisation records.'),
        ('organisation.activate', 'Activate organisations', 'Allows activating organisation records.'),
        ('organisation.suspend', 'Suspend organisations', 'Allows suspending organisation records.'),
        ('organisation.archive', 'Archive organisations', 'Allows archiving organisation records.'),
        ('organisation.profile.read', 'Read organisation profile', 'Allows reading organisation profile records.'),
        ('organisation.profile.update', 'Update organisation profile', 'Allows updating organisation profile records.'),
        ('organisation.settings.read', 'Read organisation settings', 'Allows reading organisation settings.'),
        ('organisation.settings.update', 'Update organisation settings', 'Allows updating organisation settings.'),
        ('organisation.application.create', 'Create organisation applications', 'Allows creating applications under an organisation.'),
        ('organisation.application.read', 'Read organisation applications', 'Allows reading organisation application records.'),
        ('organisation.application.search', 'Search organisation applications', 'Allows listing organisation application records.'),
        ('organisation.application.update', 'Update organisation applications', 'Allows updating organisation application records.'),
        ('organisation.application.archive', 'Archive organisation applications', 'Allows archiving organisation application records.'),
        ('organisation.service.read', 'Read organisation services', 'Allows reading enabled organisation application services.'),
        ('organisation.service.enable', 'Enable organisation services', 'Allows enabling organisation application services.'),
        ('organisation.service.disable', 'Disable organisation services', 'Allows disabling organisation application services.'),
        ('organisation.resource_link.read', 'Read organisation resource links', 'Allows reading organisation resource link records.'),
        ('organisation.resource_link.create', 'Create organisation resource links', 'Allows creating organisation resource link records.'),
        ('organisation.resource_link.update', 'Update organisation resource links', 'Allows updating organisation resource link records.'),
        ('organisation.resource_link.delete', 'Delete organisation resource links', 'Allows deleting organisation resource link records.'),
        ('organisation.audit.read', 'Read organisation audit', 'Allows reading organisation audit records.'),
        ('authorisation.permission.delete', 'Delete permissions', 'Allows deleting or deactivating permission definitions.'),
        ('authorisation.role.delete', 'Delete roles', 'Allows deleting or deactivating role bundles.'),
        ('authorisation.delegation.manage', 'Manage authorisation delegation', 'Allows managing delegated administration limits.'),
        ('authorisation.catalog.seed', 'Seed authorisation catalog', 'Allows seeding or reconciling service permission catalogs.'),
        ('authorisation.audit.read', 'Read authorisation audit', 'Allows reading authorisation audit events.'),
        ('authorisation.manage', 'Manage authorisation', 'Allows managing roles, permissions, and assignments.')
    ),
    permissionResources AS (
    INSERT INTO resources (id, name, description)
    SELECT DISTINCT
        (md5(code))::uuid::text,
        code,
        description
    FROM permissionSeed
    ON CONFLICT (name) DO UPDATE
    SET id = EXCLUDED.id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = now()
    RETURNING id
    )

    INSERT INTO permissions (id, resource_id)
    SELECT 'permission_' || encode(gen_random_bytes(12), 'hex'), (md5(code))::uuid::text
    FROM permissionSeed
    ON CONFLICT ON CONSTRAINT permissions_resource_scope_key DO UPDATE
    SET resource_id = EXCLUDED.resource_id,
        updated_at = now();

    INSERT INTO roles (id, key, name, description, level, assignable, system_role, created_by)
    VALUES
        ('role_user', 'USER', 'User', 'Legacy-compatible application user role.', 100, true, true, 'SYSTEM'),
        ('role_standard_user', 'STANDARD_USER', 'Standard User', 'Default authenticated user.', 100, true, true, 'SYSTEM'),
        ('role_member', 'MEMBER', 'Member', 'Member access role.', 200, true, true, 'SYSTEM'),
        ('role_coach', 'COACH', 'Coach', 'Coach access role.', 300, true, true, 'SYSTEM'),
        ('role_academy_admin', 'ACADEMY_ADMIN', 'Academy Admin', 'Legacy-compatible academy administrator role.', 400, true, true, 'SYSTEM'),
        ('role_academy_owner', 'ACADEMY_OWNER', 'Academy Owner', 'Legacy-compatible academy owner role.', 500, true, true, 'SYSTEM'),
        ('role_application_admin', 'APPLICATION_ADMIN', 'Application Admin', 'Application administration role.', 600, true, true, 'SYSTEM'),
        ('role_organisation_admin', 'ORGANISATION_ADMIN', 'Organisation Admin', 'Organisation administration role.', 700, true, true, 'SYSTEM'),
        ('role_organisation_owner', 'ORGANISATION_OWNER', 'Organisation Owner', 'Organisation owner role.', 800, true, true, 'SYSTEM'),
        ('role_platform_admin', 'PLATFORM_ADMIN', 'Platform Admin', 'Legacy-compatible platform administrator role.', 900, true, true, 'SYSTEM'),
        ('role_super_admin', 'SUPER_ADMIN', 'Super Administrator', 'Legacy-compatible platform owner role.', 1000, false, true, 'SYSTEM'),
        ('role_admin', 'ADMIN', 'Administrator', 'Legacy-compatible administrator role.', 1000, false, true, 'SYSTEM')
    ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        level = EXCLUDED.level,
        assignable = EXCLUDED.assignable,
        system_role = EXCLUDED.system_role,
        created_by = COALESCE(roles.created_by, EXCLUDED.created_by),
        updated_at = now();

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.key IN ('SUPER_ADMIN', 'ADMIN')
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON true
    JOIN resources resource ON resource.id = p.resource_id AND resource.name IN (
        'academy.view', 'academy.read', 'academy.search',
        'academy.membership.read',
        'course.read', 'course.search', 'course.activity.read', 'course.type.read',
        'booking.create', 'booking.read', 'booking.view',
        'auth.logout', 'auth.refresh', 'auth.password.change', 'auth.session.read', 'auth.session.revoke', 'auth.mfa.setup', 'auth.mfa.verify',
        'account.read'
    )
    WHERE r.key IN ('USER', 'STANDARD_USER')
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON true
    JOIN resources resource ON resource.id = p.resource_id AND resource.name IN (
        'academy.create', 'academy.view', 'academy.read', 'academy.edit', 'academy.update', 'academy.delete',
        'academy.claim.view', 'academy.claim.approve', 'academy.verify', 'academy.unverify',
        'academy.suspend', 'academy.activate', 'academy.archive', 'academy.restore',
        'academy.audit.view', 'academy.public.enabled', 'academy.search',
        'academy.member.read', 'academy.member.add', 'academy.member.assign', 'academy.member.remove', 'academy.membership.read',
        'academy.profile.read', 'academy.profile.update', 'academy.social.read', 'academy.social.update',
        'course.create', 'course.read', 'course.search', 'course.update', 'course.delete',
        'course.activity.create', 'course.activity.read', 'course.activity.update', 'course.activity.delete',
        'course.type.create', 'course.type.read', 'course.type.update', 'course.type.delete',
        'booking.create', 'booking.read', 'booking.view', 'booking.cancel', 'booking.confirm', 'booking.complete',
        'booking.payment_received', 'booking.payment_link',
        'booking.participant.create', 'booking.participant.read', 'booking.participant.attendance.record',
        'payment.client.create', 'payment.checkout.create', 'payment.checkout.callback',
        'payment.subscription.create', 'payment.subscription.read', 'payment.subscription.manage',
        'payment.course_occurrence_checkout.create', 'payment.course_occurrence_checkout.callback',
        'payment.create', 'payment.read', 'payment.capture', 'payment.cancel',
        'payment.search', 'payment.report.revenue.read', 'payment.report.refund.read', 'payment.report.platform_revenue.read',
        'payment.refund', 'payment.refund.read', 'payment.payee.balance.read', 'payment.webhook.receive', 'payment.outbox.dispatch',
        'payout.request.create', 'payout.request.read', 'payout.request.approve', 'payout.request.reject',
        'payout.request.hold', 'payout.request.release', 'payout.request.mark_paid', 'payout.request.cancel',
        'subscription.product.read', 'subscription.product.manage',
        'subscription.plan.read', 'subscription.plan.manage',
        'subscription.available_features.read',
        'subscription.subscription.read', 'subscription.subscription.manage',
        'subscription.entitlement.read',
        'usage_limit.read', 'usage_limit.manage',
        'auth.register', 'auth.logout', 'auth.refresh', 'auth.password.change', 'auth.session.read', 'auth.session.revoke',
        'auth.mfa.setup', 'auth.mfa.verify', 'auth.credentials.authenticate',
        'account.read', 'user.create', 'user.read', 'user.search', 'user.update', 'user.delete', 'user.mutate',
        'organisation.create', 'organisation.read', 'organisation.update', 'organisation.application.manage',
        'authorisation.permission.create', 'authorisation.permission.read', 'authorisation.permission.search', 'authorisation.permission.update',
        'authorisation.role.create', 'authorisation.role.read', 'authorisation.role.search', 'authorisation.role.update',
        'authorisation.role_permission.add', 'authorisation.role_permission.assign', 'authorisation.role_permission.read', 'authorisation.role_permission.remove',
        'authorisation.user_role.assign', 'authorisation.user_role.read', 'authorisation.user_role.remove',
        'authorisation.user_permission.assign', 'authorisation.user_permission.read', 'authorisation.user_permission.remove',
        'authorisation.effective_permission.read', 'authorisation.authorize', 'authorisation.manage'
    )
    WHERE r.key = 'PLATFORM_ADMIN'
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON true
    JOIN resources resource ON resource.id = p.resource_id AND resource.name IN (
        'academy.view', 'academy.read', 'academy.search', 'academy.edit', 'academy.update', 'academy.audit.view',
        'academy.member.read', 'academy.member.add', 'academy.member.assign', 'academy.member.remove', 'academy.membership.read',
        'academy.profile.read', 'academy.profile.update', 'academy.social.read', 'academy.social.update',
        'course.create', 'course.read', 'course.search', 'course.update', 'course.delete',
        'course.activity.create', 'course.activity.read', 'course.activity.update', 'course.activity.delete',
        'course.type.read',
        'booking.create', 'booking.read', 'booking.view', 'booking.cancel', 'booking.confirm', 'booking.complete',
        'booking.payment_received', 'booking.payment_link',
        'booking.participant.create', 'booking.participant.read', 'booking.participant.attendance.record',
        'auth.session.read',
        'account.read',
        'user.search',
        'payment.read', 'payment.search', 'payment.report.revenue.read', 'payment.report.refund.read',
        'payment.refund.read', 'payment.payee.balance.read',
        'payout.request.create', 'payout.request.read', 'payout.request.cancel'
    )
    WHERE r.key IN ('ACADEMY_OWNER', 'ACADEMY_ADMIN')
    ON CONFLICT DO NOTHING;

    IF to_regclass('users.users') IS NOT NULL THEN
        INSERT INTO user_roles (id, user_id, role_id, organisation_id, application_id, resource_id, assigned_by)
        SELECT
            'user_role_super_admin_' || protected_user.id,
            protected_user.id,
            role.id,
            NULL,
            NULL,
            NULL,
            'SYSTEM'
        FROM users.users protected_user
        JOIN roles role ON role.key = 'SUPER_ADMIN'
        WHERE protected_user.is_protected = true
          AND NOT EXISTS (
              SELECT 1
              FROM user_roles existing_user_role
              WHERE existing_user_role.user_id = protected_user.id
                AND existing_user_role.role_id = role.id
                AND existing_user_role.organisation_id IS NULL
                AND existing_user_role.application_id IS NULL
                AND existing_user_role.resource_id IS NULL
          );
    END IF;
END;
$$;
