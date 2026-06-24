# COURSES-SVC-012 Integrate RollFinders Behind Compatibility Adapter

## Goal

Move RollFinders toward the Courses service without breaking existing routes.

## Scope

* Add a server-side Courses service client in RollFinders.
* Keep existing public/admin routes stable.
* Add compatibility mapping for Open Mats and generic Courses.
* Move selected reads behind the client after backfill verification.
* Move admin writes behind the client after read parity is proven.
* Preserve `/open-mats`, `/open-mats/[id]`, `/courses`, `/courses/[id]`, `/e/[id]`, and QR behavior.

## Acceptance Criteria

* RollFinders can run with Courses service enabled or disabled during rollout.
* Open Mat pages still filter to Open Mat only.
* Course pages do not render Open Mats unless intentionally redirected.
* Academy upcoming courses still paginate correctly.
* Existing dashboard admin workflows still work.
* Fallback/rollback path is documented.
