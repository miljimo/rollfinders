# Route 53 Domain Bootstrap PRD

## Purpose

Bootstrap public DNS for RollFinders environments so frontend, API, and redirect domains resolve to the correct hosting targets.

## Scope

- Route 53 hosted zone discovery.
- Environment-specific domain naming.
- Frontend and API DNS records.
- Canonical and redirect host records.

## Requirements

### Hosted Zone Discovery

IF a base domain is configured, WHEN domain bootstrap runs, THEN the workflow must find the matching Route 53 hosted zone or fail with a clear setup error.

### Environment Domain Names

IF an environment is provisioned, WHEN DNS names are generated, THEN the domain pattern must clearly separate production from lower environments.

### Frontend DNS

IF the frontend is hosted behind CloudFront, S3, ECS, or an ALB, WHEN DNS records are created, THEN the frontend hostname must point to the active hosting target for that environment.

### API DNS

IF the API is exposed separately from the frontend, WHEN DNS records are created, THEN the API hostname must route to the correct load balancer or gateway for that environment.

### Redirect DNS

IF a `www` or alternate host is enabled, WHEN DNS is provisioned, THEN that host must redirect or route consistently to the canonical domain.

## Acceptance Criteria

- Domain bootstrap fails fast when the hosted zone cannot be found.
- Frontend and API hostnames resolve to the correct environment.
- Production and lower-environment domains cannot accidentally point to each other.
- Redirect host behavior is documented and repeatable.
