-- Organisation registry data is owned by services/organisation.
-- Domain records may still store organisation_id/application_id as external identifiers.
DROP TABLE IF EXISTS public.organisation_audit_events CASCADE;
DROP TABLE IF EXISTS public.organisation_resource_links CASCADE;
DROP TABLE IF EXISTS public.application_services CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.organisation_settings CASCADE;
DROP TABLE IF EXISTS public.organisation_profiles CASCADE;
DROP TABLE IF EXISTS public.organisations CASCADE;

DROP FUNCTION IF EXISTS public.organisation_get(text) CASCADE;
DROP FUNCTION IF EXISTS public.organisation_list() CASCADE;
DROP FUNCTION IF EXISTS public.organisation_create(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.organisation_update(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.organisation_delete(text) CASCADE;
DROP FUNCTION IF EXISTS public.application_get(text) CASCADE;
DROP FUNCTION IF EXISTS public.application_list(text) CASCADE;
DROP FUNCTION IF EXISTS public.application_service_list(text) CASCADE;
