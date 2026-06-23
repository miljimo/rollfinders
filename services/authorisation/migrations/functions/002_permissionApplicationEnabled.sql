CREATE OR REPLACE FUNCTION "permissionApplicationEnabled"(
    permission_code text,
    requested_application_id text
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM application_service_permissions asp
        WHERE asp.application_id = requested_application_id
          AND asp.service_key = split_part(permission_code, '.', 1)
    )
$$;

CREATE OR REPLACE FUNCTION permission_application_enabled(
    permission_code text,
    requested_application_id text
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO authorisation, public
AS $$
    SELECT authorisation."permissionApplicationEnabled"(permission_code, requested_application_id)
$$;
