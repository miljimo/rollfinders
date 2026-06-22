CREATE OR REPLACE FUNCTION "scopeMatches"(
    assignment_organisation_id text,
    assignment_application_id text,
    assignment_resource_type text,
    assignment_resource_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_type text,
    requested_resource_id text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO authorisation, public
AS $$
    SELECT
        (assignment_organisation_id IS NULL OR assignment_organisation_id = requested_organisation_id)
        AND (assignment_application_id IS NULL OR assignment_application_id = requested_application_id)
        AND (assignment_resource_type IS NULL OR assignment_resource_type = requested_resource_type)
        AND (assignment_resource_id IS NULL OR assignment_resource_id = requested_resource_id)
$$;

CREATE OR REPLACE FUNCTION scope_matches(
    assignment_organisation_id text,
    assignment_application_id text,
    assignment_resource_type text,
    assignment_resource_id text,
    requested_organisation_id text,
    requested_application_id text,
    requested_resource_type text,
    requested_resource_id text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO authorisation, public
AS $$
    SELECT authorisation."scopeMatches"(
        assignment_organisation_id,
        assignment_application_id,
        assignment_resource_type,
        assignment_resource_id,
        requested_organisation_id,
        requested_application_id,
        requested_resource_type,
        requested_resource_id
    )
$$;
