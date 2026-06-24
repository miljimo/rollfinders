# Architecture Review

## Review Roles

- Technical Architect: reviewed system structure, component boundaries, C4 diagrams, class design, and architecture risks.
- Delivery Manager: reviewed MVP scope, ticket sequencing, delivery risk, parallelization, and implementation estimates.

## MVP Fit

The ticket backlog is aligned with the PRD: a self-hosted, container-based, platform-agnostic, stateless Go JSON API backed by PostgreSQL. The design keeps durable state in PostgreSQL, isolates Stripe PaymentIntents and PayPal Orders behind provider adapters, avoids raw card data, and uses idempotency, row-level locking, webhooks, status history, and outbox events for payment correctness.

The MVP is credible, but not small. Payment correctness under retries, provider lifecycle mismatch, webhook ordering, and refund edge cases are the main complexity drivers.

## Architecture Decisions

- Run the API and background workers as stateless containers.
- Store payment state, refunds, provider references, idempotency records, webhook events, status history, and outbox events in PostgreSQL.
- Keep Stripe and PayPal specifics inside provider adapters.
- Normalize provider outcomes into internal commands, provider references, provider updates, and guarded state transitions.
- Use one database transaction per money-moving command where local state, status history, idempotency response, and outbox events must remain consistent.
- Use provider webhooks as asynchronous facts that are verified, deduplicated, persisted, and applied through the same state machines as API-driven changes.
- Use the outbox pattern for reliable downstream event delivery.
- Add reconciliation for pending or uncertain provider states.

## Architecture Risks

- Stripe PaymentIntents and PayPal Orders do not have identical lifecycles; forcing them into one provider-neutral flow would leak bugs into the domain.
- Idempotency must handle request hashing, response replay, concurrent identical requests, and conflicting payloads.
- Webhooks may arrive late, duplicated, or out of order.
- Row-level locking is needed around capture, cancel, refund, webhook, and reconciliation updates.
- Provider payloads, client secrets, webhook signatures, and authorization headers must not leak into logs.
- Outbox creation without a dispatcher is incomplete if downstream events are part of MVP behavior.
- OpenAPI drift will happen unless contract tests are added.

## Ticket Review

The backlog is mostly well-formed and assignable. The Delivery Manager recommends treating these P1 tickets as launch-blocking for a credible MVP:

- Ticket023ImplementOutboxDispatcher
- Ticket026ImplementMetricsEndpoint
- Ticket029AddProviderAdapterContractTests
- Ticket030AddApiIntegrationAndContractTests
- Ticket032WriteQuickstartAndConfigurationDocs

These can be deferred for a controlled beta:

- Ticket018ImplementManualCaptureAndCancelEndpoints, if only immediate capture is launched.
- Ticket020ImplementListRefundsEndpoint, if refunds are visible through payment details.
- Ticket027ImplementReconciliationJob, only for a low-volume beta with manual reconciliation accepted as an explicit risk.

## Split / Merge Recommendations

- Split Stripe and PayPal adapter tickets into payment, refund, and webhook mapping subtasks if multiple engineers or AI agents work in parallel.
- Split webhook ingestion into common ingestion/dedup plus Stripe event handling plus PayPal event handling if it grows too large.
- Split idempotency into persistence/model, middleware/request hashing, and replay/conflict behavior if implementation risk rises.
- Merge shared error model and validation only if the same engineer is doing both and OpenAPI is already stable.
- Review structured logging and sensitive data redaction together.
- Treat outbox event creation and dispatcher as one MVP capability, even if implemented in separate tickets.

## Critical Path

1. 001 -> 002/003/006
2. 003 -> 004 -> 005 -> 013
3. 006 -> 007 -> 008
4. 008 -> 009 -> 010
5. 009/010 -> 012
6. 011 + 012 -> 014/015
7. 014/015 + 013 -> 016
8. 016 -> 019
9. 014/015/019 -> 021
10. 016/019/021 -> 030
11. 002/028 -> 031
12. 002/016/019/021 -> 032

## Recommended Delivery Phases

1. Foundation: 001, 002, 003, 004, 005, 006, 024, 031.
2. Domain and persistence: 007, 008, 009, 010, 011, 022, 028.
3. Provider integrations: 012, 014, 015, 029.
4. API workflows: 013, 016, 017, 018, 019, 020.
5. Async and operations: 021, 023, 026, 027, 025, 030, 032.

## Overall Timeline

- Full 32-ticket backlog, one experienced human engineer: about 288 hours, or 48 focused days.
- Full 32-ticket backlog, AI coding agent with human review: about 202 hours, or 34 focused days.
- Realistic solo calendar time, human only: 8-10 weeks.
- Realistic solo calendar time, AI-assisted: 5-7 weeks.
- Two experienced engineers: 5-6 weeks.
- Three engineers: 3.5-5 weeks.
- Two AI agents plus one strong reviewer: 4-5 weeks.

For a practical MVP that includes all P0 plus launch-critical P1 tickets 023, 026, 029, 030, 031, and 032, expected delivery is:

- Experienced solo engineer: 7-9 weeks.
- AI-assisted solo reviewer/operator: 5-6 weeks.
- Two engineers or two agents with one senior reviewer: 4-5 weeks.
