# PRD: Monolithic Services App Dev Deployment

Status: Reviewing

Last updated: 2026-06-18

## Summary

Deploy the RollFinders Next.js application and its internal Go services as one dev environment application unit.

For now, Go services are internal implementation services. They SHALL NOT be publicly reachable. Only the RollFinders web application may call them.

The deployment pipeline SHALL avoid rebuilding and redeploying unchanged Go services unless an operator explicitly forces it.

## Scope

In scope:

* Dev deployment environment.
* RollFinders web application container.
* Users Go service container.
* Payments Go service container.
* Private service-to-app communication.
* Change-based service image build and redeploy gating.
* Bitbucket pipeline integration.

Out of scope:

* Public API Gateway exposure for Go services.
* Separate public load balancers for Go services.
* Production rollout until dev is proven.
* Cross-application access to users/payments services.

## Architecture

The dev deployment SHALL use one ECS service for the monolithic services app.

The ECS task SHALL contain:

* `web`: Next.js RollFinders application.
* `users`: Go users/auth service.
* `payments`: Go payments service.

The public ALB SHALL route only to the `web` container on port `3000`.

The Go service containers SHALL listen only inside the ECS task network. RollFinders SHALL call them by internal task-local URLs:

```text
USER_SERVICE_URL=http://127.0.0.1:8081
PAYMENT_SERVICE_URL=http://127.0.0.1:8082
```

No ALB listener, target group, public DNS record, API Gateway route, or public security group rule SHALL be created for the Go service ports.

## Security Requirements

IF a Go service is deployed

THEN it SHALL NOT have public ingress.

IF the public ALB receives traffic

THEN it SHALL only forward traffic to the RollFinders `web` container.

IF the RollFinders app calls a Go service

THEN the call SHALL use the internal service URL and API key injected through secrets.

IF another external client attempts to reach a Go service

THEN no public route SHALL exist.

## Pipeline Requirements

The Bitbucket pipeline SHALL support dev deployment for the monolithic services app.

The pipeline SHALL build the web image for dev as it does today.

The pipeline SHALL evaluate path changes for each Go service:

* `services/users/**`
* `services/payments/**`

IF a service path has not changed

THEN that service image SHALL NOT be rebuilt or pushed.

IF a service path has not changed

THEN that service SHALL NOT be redeployed.

IF `FORCE_SERVICE_REDEPLOY=true`

THEN all Go service images SHALL be rebuilt and made available for redeployment even when their paths have not changed.

IF `SERVICE_REDEPLOY_TARGET` is set to `users` or `payments`

THEN only that service SHALL be forced.

IF `SERVICE_REDEPLOY_TARGET` is empty or `all`

THEN all services SHALL be eligible for forced rebuild.

## Image Requirements

Each deployable container SHALL have its own ECR repository:

```text
rollfinder/dev/app
rollfinder/dev/users
rollfinder/dev/payments
```

Images SHALL be tagged with:

* immutable commit SHA
* `dev`
* `latest`

The pipeline SHALL emit image metadata in `image.env`.

## Terraform Requirements

Terraform SHALL allow the Go service sidecars to be enabled by image URI variables.

IF `user_service_image_uri` is empty

THEN the `users` sidecar SHALL be omitted.

IF `payment_service_image_uri` is empty

THEN the `payments` sidecar SHALL be omitted.

IF a sidecar image URI is unchanged and no force flag is provided

THEN Terraform SHOULD keep the existing task definition image for that sidecar.

## Dev Acceptance Criteria

GIVEN a change only touches RollFinders web application files

WHEN the dev pipeline runs

THEN the web image SHALL build and deploy

AND users/payments images SHALL not build

AND users/payments SHALL not redeploy.

GIVEN a change touches `services/users/**`

WHEN the dev pipeline runs

THEN the users image SHALL build

AND the monolithic dev task SHALL use the new users image.

GIVEN a change touches `services/payments/**`

WHEN the dev pipeline runs

THEN the payments image SHALL build

AND the monolithic dev task SHALL use the new payments image.

GIVEN no service files changed

WHEN `FORCE_SERVICE_REDEPLOY=true`

THEN service images SHALL be rebuilt according to `SERVICE_REDEPLOY_TARGET`.

GIVEN the dev app is deployed

WHEN a public user opens the dev site

THEN only the RollFinders web application SHALL be reachable publicly.

GIVEN the dev app is deployed

WHEN RollFinders needs users or payments functionality

THEN it SHALL call the internal Go service containers inside the task.

## Operational Notes

The first dev rollout MAY force both services so image variables and task sidecars are initialized.

After the first rollout, service changes SHOULD be path-gated to keep deployments fast and painless.

Production SHALL not use this deployment mode until a separate production rollout PRD or release ticket approves it.
