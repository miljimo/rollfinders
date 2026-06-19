# COURSES-SVC-013 Add Verification And Release Gates

## Goal

Add the tests, checks, and release evidence required before production rollout.

## Scope

* Domain unit tests.
* SQL function/procedure integration tests.
* Backfill verification tests.
* OpenAPI contract tests.
* RollFinders route parity tests.
* Open Mat regression suite.
* Docker compose smoke test.
* Deployment checklist.

## Acceptance Criteria

* Existing user login behavior is unaffected.
* Existing Open Mat discovery/detail/admin behavior is unaffected.
* Existing Course discovery/detail/admin behavior is unaffected.
* Public event IDs and QR links are stable.
* Payment references still resolve to the correct public course/open-mat page.
* Service SQL migrations run before service deployment.
* Release notes include rollback instructions.
