# Ticket 010 Notification Regression Runbook

Owner: Tina Ugbekile, Test Engineer.

This runbook is the verification scaffold for ticket 010. It now complements the executable Notification Service API, database, worker, and provider implementation, and must stay in lockstep with `apps/backend_api/internal/services/notification/docs/product.md` and the ticket 001-009 refinement docs.

## Required Gates

| Gate | Coverage | Initial verification |
| --- | --- | --- |
| Create and idempotency | `POST /notifications` returns `notificationId` and `QUEUED`; duplicate idempotency requests return the original notification without a second row. | Add API tests once the endpoint exists; keep static PRD coverage in `apps/backend_api/containers/notification/tests/test_regression_scaffolding.py`. |
| Retry schedule | Retryable provider failures follow PRD timing: Attempt 2: 1 minute, Attempt 3: 5 minutes, Attempt 4: 15 minutes, Attempt 5: 1 hour; exhausted retries become `FAILED_PERMANENT`. | Worker tests must use a deterministic clock and assert `next_attempt_at`. |
| Queue locking | Due notifications are selected with row-level locking such as `FOR UPDATE SKIP LOCKED`; concurrent workers preserve single worker ownership and do not send the same notification twice. | Database/worker tests must run at least two workers against the same due row. |
| Provider fake SMTP | SMTP provider tests use a fake SMTP server for success, retryable failure, permanent failure, recipients, HTML/text bodies, and attachment references. | live provider calls disabled by default; any live provider certification must require an explicit environment flag. |
| Search and details | `GET /notifications` supports status, channel, recipient, date range, source service, pagination, and stable sorting; `GET /notifications/{notificationId}` returns recipients, attachments, metadata, provider fields, status, attempt count, and attempt history. | API tests must include unauthorized, not found, BCC handling, and opaque metadata cases. |
| Business integration | Booking Service submits notification content for a booking confirmation while Notification Service stores and delivers it without interpreting business metadata. | Integration example must keep content generation in Booking Service and treat metadata as opaque metadata. |
| Data ownership | notification tables are owned by `apps/backend_api/internal/services/notification/migrations`; no app, booking, users, courses, payments, academy, authorisation, organisation, or analytics migration may create, alter, drop, insert, update, or delete notification persistence tables. | Static ownership test scans service migrations for notification table mutations outside the notification service. |

## Regression Matrix

| Area | Required scenarios |
| --- | --- |
| API create | Success, unauthorized, validation failure, unsupported channel, duplicate idempotency, attachments, cc, bcc, metadata round trip. |
| Database | Clean apply, rollback if supported, constraints, duplicate idempotency, queue polling indexes, search indexes, source service metadata index. |
| Worker | Successful send, retryable failure, permanent failure, exhausted retries, priority ordering, locking, batch processing, worker restart recovery. |
| Provider | Fake SMTP success, retryable failure, permanent failure, recipients, HTML/text bodies, attachments, secret redaction, BCC redaction from logs. |
| Search/details | Status filter, channel filter, recipient filter, date range filter, source service filter, pagination, missing notification, unauthorized caller. |
| Platform compatibility | App, booking, users, courses, payments, and notification services run together in local Docker with no cross-service notification table ownership. |

## Remaining Gaps

- Live PostgreSQL migration apply/rollback tests.
- End-to-end API plus worker delivery tests.
- Compose-level fake SMTP test path.
- Booking Service integration example.
- Metrics and lifecycle event assertions after ticket 009 is completed.

## Local Run Notes

Run the current static scaffold:

```bash
python3 -m unittest discover -s apps/backend_api/containers/notification/tests
```

Before release, run the future executable suite with local dependencies:

```bash
docker compose up -d postgres fake-smtp
cd apps/backend_api && go test ./cmd/services/notification/...
python3 -m unittest discover -s apps/backend_api/containers/notification/tests
```

The fake SMTP service is mandatory for provider regression tests. Do not configure real SMTP credentials in the default local or CI path.

## Ownership Search

Use this search when reviewing ownership:

```bash
rg -n "\b(create\s+table|alter\s+table|drop\s+table|insert\s+into|update|delete\s+from)\s+(if\s+(not\s+)?exists\s+)?(notifications|email_messages|email_recipients|notification_attachments|notification_attempts|notification\.)\b|\b(notifications|email_messages|email_recipients|notification_attachments|notification_attempts)\b" apps/backend_api/containers --glob '*/migrations/**/*.sql' --glob '!apps/backend_api/containers/notification/**' -i
```

Expected result today: no matches.
