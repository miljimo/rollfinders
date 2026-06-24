\ir schema/001_organisation_schema.sql
SET search_path TO organisation, public;

\ir schema/002_schema_migrations.sql
\ir tables/001_organisations.sql
\ir tables/002_organisation_profiles.sql
\ir tables/003_organisation_settings.sql
\ir tables/004_applications.sql
\ir tables/005_application_services.sql
\ir tables/006_organisation_resource_links.sql
\ir tables/007_organisation_audit_events.sql
\ir procedures/001_seedOrganisationCatalog.sql

CALL "seedOrganisationCatalog"();

INSERT INTO schema_migrations(version) VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
