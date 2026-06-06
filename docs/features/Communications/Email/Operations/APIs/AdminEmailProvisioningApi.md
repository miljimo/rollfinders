# PRD: Admin Email Provisioning API

Version: 1.0

Route: `GET /api/admin/email-provisioning`

Source: `src/app/api/admin/email-provisioning/route.ts`

---

# Schema Impact

No schema changes are required for this PRD.

IF this API is implemented

WHEN the deployment is prepared

THEN no database migration script SHALL be required for this PRD.

AND deployment SHALL only require application code and configuration changes.

---

# Objective

Expose non-secret email provisioning configuration to authorized platform admins.

---

# IF/WHEN/THEN Requirements

## EMAIL-PROV-001: Platform Admin Authorization

IF a user calls `GET /api/admin/email-provisioning`

WHEN the user lacks platform admin permissions

THEN the API SHALL reject the request.

## EMAIL-PROV-002: Return Provisioning Config

IF an authorized platform admin calls the API

WHEN email provisioning configuration is available

THEN the API SHALL return the provisioning configuration as JSON.

## EMAIL-PROV-003: Secret Safety

IF provisioning configuration contains provider credentials or tokens

WHEN the response is generated

THEN the API SHALL exclude secret values from the response.

---

# Acceptance Criteria

* Only platform admins can access the endpoint.
* The response supports admin diagnostics.
* Secrets are not returned to the client.
