# Implementation Estimates

Assumptions:

- 1 day = 6 focused engineering hours.
- Human estimate means an experienced Go/backend engineer familiar with payments.
- AI + review estimate means an AI coding agent implements with human review of design, diffs, tests, and provider behavior.
- Estimates include implementation and local verification, not legal/compliance review or provider account setup delays.

| ID | Ticket | Human | AI + Review | Notes |
|---:|---|---:|---:|---|
| 001 | Bootstrap Go API Service | 4h | 2h | Router, config, health, layout |
| 002 | Containerize Service And Local Compose | 5h | 3h | Go image, Postgres compose |
| 003 | Define OpenAPI MVP Contract | 8h | 5h | Needs careful lifecycle modeling |
| 004 | Implement Shared API Error Model | 4h | 2h | Should align with OpenAPI |
| 005 | Add Request Validation Middleware | 6h | 4h | Request/body/path validation |
| 006 | Create PostgreSQL Migration Framework | 5h | 3h | Tooling and local workflow |
| 007 | Create Core Payment Schema | 8h | 5h | Payment/refund/provider/idempotency tables |
| 008 | Implement Repository Layer | 12h | 8h | Transactions, locking, query shape |
| 009 | Implement Payment State Machine | 12h | 8h | Critical correctness area |
| 010 | Implement Refund State Machine | 8h | 5h | Refund transitions and partials |
| 011 | Implement Idempotency Layer | 12h | 8h | Response replay, conflict behavior |
| 012 | Define Provider Adapter Interface | 8h | 5h | Must avoid leaking Stripe/PayPal details |
| 013 | Implement API Authentication | 6h | 4h | API key or bearer-token MVP |
| 014 | Implement Stripe PaymentIntents Adapter | 16h | 12h | Create/confirm/capture/cancel/refund/webhooks |
| 015 | Implement PayPal Orders Adapter | 16h | 12h | Approval/capture lifecycle differs from Stripe |
| 016 | Implement Create Payment Endpoint | 14h | 9h | Main orchestration path |
| 017 | Implement Get Payment Endpoint | 6h | 3h | Straightforward read path |
| 018 | Implement Manual Capture And Cancel Endpoints | 10h | 7h | Depends on auth/capture semantics |
| 019 | Implement Refund Endpoint | 14h | 9h | Partial refunds, idempotency, provider sync |
| 020 | Implement List Refunds Endpoint | 4h | 2h | Simple once schema exists |
| 021 | Implement Webhook Ingestion Endpoint | 16h | 12h | Signature verification, event mapping, ordering |
| 022 | Implement Outbox Event Creation | 8h | 5h | Transactional writes from state changes |
| 023 | Implement Outbox Dispatcher | 10h | 7h | Retries, backoff, delivery marking |
| 024 | Implement Structured Logging And Request IDs | 5h | 3h | Middleware and logger propagation |
| 025 | Implement Sensitive Data Redaction | 5h | 4h | Needs tests and discipline |
| 026 | Implement Metrics Endpoint | 6h | 4h | Prometheus-style counters/histograms |
| 027 | Implement Reconciliation Job | 14h | 10h | Important but often underestimated |
| 028 | Add Domain Unit Tests | 10h | 7h | State machines and idempotency |
| 029 | Add Provider Adapter Contract Tests | 12h | 9h | Mock/provider fixture discipline |
| 030 | Add API Integration And Contract Tests | 16h | 11h | End-to-end API + OpenAPI drift checks |
| 031 | Create CI Pipeline | 6h | 4h | Lint/test/build/container |
| 032 | Write Quickstart And Configuration Docs | 6h | 4h | Local run, env vars, provider setup |

Total:

- Human: 288h, about 48 focused days.
- AI + human review: 202h, about 34 focused days.
