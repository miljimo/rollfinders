# Users Platform Admin PRDs

This folder groups RollFinders Platform Admin requirements under the Users feature area.

## Migration Policy

Every PRD in this folder SHALL state its schema impact near the top.

IF a PRD requires schema changes

WHEN it is prepared for development or deployment

THEN the required migration scripts and deployment ordering SHALL be part of that PRD's requirements.

IF a PRD does not require schema changes

WHEN it is prepared for development or deployment

THEN the PRD SHALL explicitly state that no database migration script is required.

## Products

* `Products/PlatformAdministrationAndModeration.md`
* `Products/PlatformAdminDashboardRoles.md`
* `Products/PlatformAdminActivityTargetsAndRewards.md`
* `Products/PlatformUserManagement.md`
* `Products/AdminDashboardRestructureWithPagination.md`
* `Products/EnhanceAdminPage.md`

## APIs

* `APIs/AdminPlatformAdminsApi.md`
* `APIs/AdminUsersApi.md`
* `APIs/AdminUserDetailApi.md`
* `APIs/AdminUserPromoteApi.md`

Email provisioning API requirements live under `docs/features/Communications/Email/Operations/APIs/AdminEmailProvisioningApi.md`.

## Pages

* `Pages/AdminDashboardPage.md`
* `Pages/AdminSettingsPage.md`
