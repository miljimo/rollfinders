# Notification Service Implementation Tickets

Source PRD: [`apps/backend_api/internal/services/notification/docs/product.md`](../../../../product.md)

Status: In Progress

Branch:

```text
feature/notification-service
```

---

# Architectural Direction

Build Notification Service as a platform-level Go service that accepts business-generated notification content, persists requests before delivery, processes delivery asynchronously, and records status and attempt history.

Version 1 SHALL support Email only. The domain and persistence model SHALL remain channel-aware so SMS, WhatsApp, push, and in-app notifications can be added later without redesigning the service.

The service SHALL NOT generate business-specific content or contain business rules for password resets, bookings, academy claims, subscriptions, or marketing campaigns. Calling services own content generation and submit complete notification requests.

Core v1 flow:

```text
POST /notifications
  -> validate request
  -> persist notification, recipients, attachments, metadata
  -> status QUEUED
  -> worker locks due queued/retryable notification
  -> provider sends email
  -> status SENT or FAILED_RETRYABLE/FAILED_PERMANENT
  -> attempt history, audit data, metrics, and events are recorded
```

---

# Recommended Order

| Order | Ticket | State | Depends On |
| --- | --- | --- | --- |
| 1 | [001 - Notification Service Skeleton](ticket001NotificationServiceSkeleton.md) | Implemented | None |
| 2 | [002 - Notification API Contract](ticket002NotificationApiContract.md) | Implemented | Ticket001 |
| 3 | [003 - Notification Database Schema](ticket003NotificationDatabaseSchema.md) | Implemented | Ticket001, Ticket002 |
| 4 | [004 - Notification Data Access Layer](ticket004NotificationDataAccessLayer.md) | Implemented | Ticket003 |
| 5 | [005 - Email Provider Abstraction](ticket005EmailProviderAbstraction.md) | Implemented | Ticket002 |
| 6 | [006 - Create Notification Endpoint](ticket006CreateNotificationEndpoint.md) | Implemented | Ticket002, Ticket004 |
| 7 | [007 - Queue Worker And Retry Processing](ticket007QueueWorkerAndRetryProcessing.md) | Implemented | Ticket004, Ticket005, Ticket006 |
| 8 | [008 - Notification Search And Details Endpoints](ticket008NotificationSearchAndDetailsEndpoints.md) | Implemented | Ticket004, Ticket006, Ticket007 |
| 9 | [009 - Events Metrics And Audit Visibility](ticket009EventsMetricsAndAuditVisibility.md) | Partially Implemented | Ticket006, Ticket007, Ticket008 |
| 10 | [010 - Notification Integration And Regression Suite](ticket010NotificationIntegrationAndRegressionSuite.md) | Partially Implemented | Ticket001 through Ticket009 |

---

# Current Implementation Notes

- Notification Service API and worker exist under `services/notification`.
- Persistence is normalized: `notifications` is channel-generic, while Email content and recipients live in `email_messages` and `email_recipients`.
- Notification tables are owned only by `apps/backend_api/internal/services/notification/migrations`.
- The Next.js web app submits Email notifications through the Notification Service adapter; legacy public email queue tables are dropped by Prisma migration.
- SMTP provider and retry worker are implemented.
- Metrics and lifecycle event publication are still incomplete.
- Regression coverage exists for unit-level API/worker/provider behavior and ownership scaffolding; live database, live SMTP, and business-service integration tests remain incomplete.

---

# MVP Boundaries

- Implement Email only.
- Implement SMTP as the first provider.
- Store attachment references by `storageUrl`; do not build file upload in v1.
- Store metadata without interpreting it.
- Enforce idempotency for create requests.
- Provide search and details endpoints for operational troubleshooting.
- Publish notification lifecycle events where the platform event pattern already exists.
- Expose core metrics for queue depth, processing count, send duration, and status totals.

---

# Deferred From PRD

- SMS, WhatsApp, push, and in-app channels.
- Provider failover.
- Scheduled or recurring notifications.
- Campaign management, newsletters, segmentation, and templates.
- Per-service, per-tenant, and per-academy rate limits.
