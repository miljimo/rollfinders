# RollFinders Documentation

Shared platform, product strategy, deployment, infrastructure, and architecture documentation stays in this top-level `docs/` tree.

Portal-owned UI, page, dashboard, reusable component, and portal API-route documentation lives in:

```text
apps/portal/docs/
```

Service-owned documentation lives beside the service implementation:

```text
apps/backend_api/internal/services/<service>/docs/
```

Each service docs folder may contain:

- `product.md` for the current implemented or partially implemented service product contract.
- `prds/` for service PRDs and proposals.
- `tickets/` for service-owned implementation tickets.
- `runbooks/` for operational guidance.
- `api/` for OpenAPI and API contract files.
- `architecture/` for service architecture notes.
- `archive/` for stale, superseded, or unimplemented service docs.

Archived docs are retained for history. They are not implementation commitments unless current code, tests, or contracts still validate the behavior.
