CREATE OR REPLACE PROCEDURE "seedOrganisationCatalog"()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO organisations (id, name, slug, status)
    VALUES ('org_rollfinders', 'RollFinders', 'rollfinders', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        status = EXCLUDED.status,
        updated_at = now();

    INSERT INTO organisation_profiles (organisation_id, legal_name)
    VALUES ('org_rollfinders', 'RollFinders Ltd')
    ON CONFLICT (organisation_id) DO UPDATE
    SET legal_name = EXCLUDED.legal_name,
        updated_at = now();

    INSERT INTO applications (id, organisation_id, name, slug, status)
    VALUES ('app_rollfinders', 'org_rollfinders', 'RollFinders Marketplace', 'rollfinders-marketplace', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE
    SET organisation_id = EXCLUDED.organisation_id,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        status = EXCLUDED.status,
        updated_at = now();

    INSERT INTO application_services (application_id, service_key, enabled)
    VALUES
        ('app_rollfinders', 'users', true),
        ('app_rollfinders', 'authorisation', true),
        ('app_rollfinders', 'academy', true),
        ('app_rollfinders', 'course', true),
        ('app_rollfinders', 'booking', true),
        ('app_rollfinders', 'payment', true),
        ('app_rollfinders', 'notification', false),
        ('app_rollfinders', 'analytics', false)
    ON CONFLICT (application_id, service_key) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        updated_at = now();
END;
$$;
