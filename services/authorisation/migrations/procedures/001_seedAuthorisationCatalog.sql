CREATE OR REPLACE PROCEDURE "seedAuthorisationCatalog"()
LANGUAGE plpgsql
SET search_path TO authorisation, public
AS $$
BEGIN
    INSERT INTO permissions (id, code, name, description, level)
    VALUES
        ('perm_academy_create', 'academy.create', 'Create academies', 'Allows creating academy resources.', 400),
        ('perm_academy_read', 'academy.read', 'Read academies', 'Allows reading academy management data.', 200),
        ('perm_academy_update', 'academy.update', 'Update academies', 'Allows updating academy resources.', 400),
        ('perm_academy_delete', 'academy.delete', 'Delete academies', 'Allows deleting academy resources.', 700),
        ('perm_academy_claim_approve', 'academy.claim.approve', 'Approve academy claims', 'Allows approving academy ownership claims.', 600),
        ('perm_course_create', 'course.create', 'Create courses', 'Allows creating courses and events.', 300),
        ('perm_course_update', 'course.update', 'Update courses', 'Allows updating courses and events.', 300),
        ('perm_course_delete', 'course.delete', 'Delete courses', 'Allows deleting courses and events.', 500),
        ('perm_booking_view', 'booking.view', 'View bookings', 'Allows viewing bookings.', 200),
        ('perm_booking_cancel', 'booking.cancel', 'Cancel bookings', 'Allows cancelling bookings.', 300),
        ('perm_payment_refund', 'payment.refund', 'Refund payments', 'Allows creating payment refunds.', 600),
        ('perm_payout_request_approve', 'payout.request.approve', 'Approve payout requests', 'Allows approving payout requests.', 700),
        ('perm_user_create', 'user.create', 'Create users', 'Allows creating users.', 600),
        ('perm_user_read', 'user.read', 'Read users', 'Allows reading user administration data.', 400),
        ('perm_user_update', 'user.update', 'Update users', 'Allows updating managed users.', 600),
        ('perm_user_delete', 'user.delete', 'Delete users', 'Allows deleting users.', 800),
        ('perm_organisation_application_manage', 'organisation.application.manage', 'Manage organisation applications', 'Allows managing application enablement.', 700),
        ('perm_authorisation_manage', 'authorisation.manage', 'Manage authorisation', 'Allows managing roles, permissions, and assignments.', 900)
    ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        level = EXCLUDED.level,
        updated_at = now();

    INSERT INTO roles (id, key, name, description, level, assignable, system_role)
    VALUES
        ('role_user', 'USER', 'User', 'Legacy-compatible application user role.', 100, true, true),
        ('role_standard_user', 'STANDARD_USER', 'Standard User', 'Default authenticated user.', 100, true, true),
        ('role_member', 'MEMBER', 'Member', 'Member access role.', 200, true, true),
        ('role_coach', 'COACH', 'Coach', 'Coach access role.', 300, true, true),
        ('role_academy_admin', 'ACADEMY_ADMIN', 'Academy Admin', 'Legacy-compatible academy administrator role.', 400, true, true),
        ('role_academy_owner', 'ACADEMY_OWNER', 'Academy Owner', 'Legacy-compatible academy owner role.', 500, true, true),
        ('role_application_admin', 'APPLICATION_ADMIN', 'Application Admin', 'Application administration role.', 600, true, true),
        ('role_organisation_admin', 'ORGANISATION_ADMIN', 'Organisation Admin', 'Organisation administration role.', 700, true, true),
        ('role_organisation_owner', 'ORGANISATION_OWNER', 'Organisation Owner', 'Organisation owner role.', 800, true, true),
        ('role_platform_admin', 'PLATFORM_ADMIN', 'Platform Admin', 'Legacy-compatible platform administrator role.', 900, true, true),
        ('role_super_admin', 'SUPER_ADMIN', 'Super Administrator', 'Legacy-compatible platform owner role.', 1000, false, true),
        ('role_admin', 'ADMIN', 'Administrator', 'Legacy-compatible administrator role.', 1000, false, true)
    ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        level = EXCLUDED.level,
        assignable = EXCLUDED.assignable,
        system_role = EXCLUDED.system_role,
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
    JOIN permissions p ON p.code IN (
        'academy.create', 'academy.read', 'academy.update', 'academy.claim.approve',
        'course.create', 'course.update', 'course.delete',
        'booking.view', 'booking.cancel',
        'payment.refund', 'payout.request.approve',
        'user.create', 'user.read', 'user.update',
        'organisation.application.manage', 'authorisation.manage'
    )
    WHERE r.key = 'PLATFORM_ADMIN'
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.code IN ('academy.read', 'academy.update', 'course.create', 'course.update', 'course.delete', 'booking.view', 'booking.cancel')
    WHERE r.key IN ('ACADEMY_OWNER', 'ACADEMY_ADMIN')
    ON CONFLICT DO NOTHING;
END;
$$;
