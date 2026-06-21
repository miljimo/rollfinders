# Payment System

Self-hosted Go JSON API for the Payment System MVP. The service supports local one-time Stripe card, Stripe Google Pay, and PayPal wallet flows through provider adapters, idempotent payment operations, refunds, webhook ingestion, outbox records, and Prometheus-style metrics.

The backend never accepts raw card PAN or CVV fields. Stripe.js, PayPal approval, or another hosted client-side collection flow should collect sensitive payment details.

## Quickstart

```bash
docker compose up --build
```

The compose stack starts PostgreSQL, initializes `migrations/001_core_schema.sql`, and runs the API with `API_KEY=local-dev-key`. The top-level migration is an ordered orchestrator that loads schema, type, table, function, and procedure files from subfolders.

```bash
curl http://localhost:3002/healthz
curl http://localhost:3002/readyz
```

Create a Stripe card payment:

```bash
curl -s http://localhost:3002/v1/payments \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-demo-1' \
  -d '{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"card","capture_method":"automatic","metadata":{"order_id":"ord_123"}}'
```

Create a Stripe Google Pay payment intent:

```bash
curl -s http://localhost:3002/v1/payments \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-demo-google-pay-1' \
  -d '{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"google_pay","capture_method":"automatic","metadata":{"order_id":"ord_123"}}'
```

For hosted Stripe Checkout, Google Pay is enabled through Stripe's card payment method rails. The service accepts `payment_method_type:"google_pay"` for client intent and records, then sends `payment_method_types[0]=card` to Stripe Checkout so eligible wallets can appear when enabled in Stripe.

Create a PayPal wallet payment:

```bash
curl -s http://localhost:3002/v1/payments \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-demo-2' \
  -d '{"amount":1299,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}'
```

Create a generic hosted checkout:

```bash
curl -s http://localhost:3002/v1/checkouts \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: course-cmq123-2026-06-08-1900-student' \
  -d '{
    "client_id":"rollfinders",
    "client_state":"order_123",
    "resource_type":"course_occurrence",
    "resource_id":"cmq123:2026-06-08:19:00",
    "resource_label":"Beginner BJJ",
    "amount":1000,
    "currency":"GBP",
    "provider":"paypal",
    "payment_method_type":"paypal",
    "payer_email":"student@example.com",
    "metadata":{
      "course_id":"cmq123",
      "academy_id":"academy123",
      "occurrence_date":"2026-06-08",
      "occurrence_start_time":"19:00",
      "occurrence_end_time":"20:30"
    }
  }'
```

Register another service as a payment client:

```bash
curl -s http://localhost:3002/v1/clients \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{"id":"partner_app","name":"Partner App","callback_url":"https://partner.example.com/payments/callback"}'
```

Refund a payment:

```bash
curl -s http://localhost:3002/v1/payments/pay_000001/refunds \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: refund-demo-1' \
  -d '{"amount":500,"reason":"requested_by_customer"}'
```

Send a local Stripe-style webhook:

```bash
curl -s http://localhost:3002/v1/webhooks/stripe \
  -H 'Content-Type: application/json' \
  -H 'Stripe-Signature: test-signature' \
  -d '{"id":"evt_demo_1","payment_id":"pay_000001","status":"succeeded","type":"payment_intent.succeeded"}'
```

## Configuration

The service reads configuration from environment variables only.

- `PORT`, default `8080`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, used to build the PostgreSQL connection for `/readyz`
- `DATABASE_URL`, optional compatibility override when DB parts are not supplied
- `API_KEY`, required for protected payment/refund/status endpoints and `/readyz`
- `PAYMENT_PUBLIC_BASE_URL`, default `http://localhost:3002`; used to build service-owned provider callback URLs
- `PAYMENT_DEFAULT_CLIENT_ID`, default `default`; optional pre-registered client id for local/single-client deployments
- `PAYMENT_DEFAULT_CLIENT_NAME`, default `Default Client`; display name for the pre-registered client
- `PAYMENT_DEFAULT_CLIENT_CALLBACK_URL`; optional callback URL for the pre-registered client. `PAYMENT_APPLICATION_STATUS_URL` is still accepted as a legacy alias.
- `METRICS_ENABLED`, default `true`; set to `false` to hide `/metrics`
- `READ_TIMEOUT`, default `5s`
- `WRITE_TIMEOUT`, default `10s`
- `SHUTDOWN_TIMEOUT`, default `10s`
- `STRIPE_SECRET_KEY`, Stripe secret key. If omitted, the service falls back to `PAYMENT_GATEWAY_API_KEY` for compatibility with older local environments.
- `PAYMENT_GATEWAY_API_KEY`, legacy/local Stripe secret key name.
- `STRIPE_SECRET_KEY_FILE`, optional path to a mounted file containing the Stripe secret key. The service rereads this file for each Stripe operation, so rotating the file contents does not require restarting the payment service.
- `STRIPE_WEBHOOK_SECRET`, future live Stripe webhook verification secret
- `PAYPAL_CLIENT_ID`, future live PayPal credential
- `PAYPAL_CLIENT_SECRET`, future live PayPal credential
- `PAYPAL_WEBHOOK_ID`, future live PayPal webhook verification identifier

If database configuration or `API_KEY` is missing, `/readyz` returns `503` with a clear reason. Protected endpoints return `401` when credentials are missing or invalid.

Environment variables inside a running container cannot be changed without recreating the container. Use `STRIPE_SECRET_KEY_FILE` for restart-free local or production key rotation. For example, mount a secret file at `/run/secrets/stripe_secret_key`, set `STRIPE_SECRET_KEY_FILE=/run/secrets/stripe_secret_key`, and replace the file contents when rotating the key.

## Idempotency

Money-moving mutating endpoints require `Idempotency-Key`:

- `POST /v1/checkouts`
- `POST /v1/payments`
- `POST /v1/payments/{id}/capture`
- `POST /v1/payments/{id}/cancel`
- `POST /v1/payments/{id}/refunds`

Retrying the same key with the same request body returns the original response with `Idempotent-Replayed: true`. Reusing the same key for a different request returns `409 idempotency_conflict`.

## Generic Hosted Checkouts

`POST /v1/checkouts` is the reusable checkout endpoint for any registered application or service. It creates an underlying payment and returns:

- `checkout_session_id`
- `checkout_url`
- `payment_id`
- client-defined resource identifiers
- payer email
- expiry timestamp

The endpoint requires a client-defined resource:

- `resource_type`, such as `course_occurrence`, `invoice`, `booking`, or `order`
- `resource_id`, a stable id meaningful to the client service
- optional `resource_label`
- optional `metadata` for client-specific lookup fields

Rollfinder course occurrence payments use `resource_type=course_occurrence` and store `course_id`, `academy_id`, `occurrence_date`, `occurrence_start_time`, and `occurrence_end_time` in metadata. Other services should use their own resource type and metadata without needing a new payment endpoint.

The payment service owns provider callback URI handling and canonical payment status orchestration. Client callers should not build success or cancel URLs for this endpoint; legacy `success_url` and `cancel_url` fields remain accepted only for backward compatibility while provider adapters move to service-owned callback configuration.

Clients are registered with a callback URL. Checkout requests carry a `client_id` and may include an opaque `client_state`; the service redirects back to the registered client callback with checkout id, payment id, canonical status, and state.

Provider return and cancel URLs should target the service-owned callback route:

```text
GET /v1/checkouts/{checkout_session_id}/callbacks/{success|cancelled|failed|expired}
```

That route redirects browsers to the registered client callback URL with checkout, payment, resource, result, payment status, state, and metadata query parameters.

The legacy `/v1/course-occurrence-checkouts` route remains available as a compatibility alias for older callers, but new integrations should use `/v1/checkouts`.

## Payment History

The payment service is the system of record for payment transactions. Clients should query payment history from the payment service instead of calling Stripe or PayPal directly.

List recorded payments:

```bash
curl -s 'http://localhost:3002/v1/payments?client_id=rollfinders&payer_email=student@example.com' \
  -H 'Authorization: Bearer local-dev-key'
```

Useful filters:

- `client_id`
- `resource_type`
- `resource_id`
- `payer_user_id`
- `payer_email`
- `status`
- `limit`, capped at `100`

The response includes the payment record plus checkout context such as `checkout_session_id`, `resource_type`, `resource_id`, `payer_email`, and `client_id`.

## Interaction Model

```text
Client Application <-> Payment Service <-> Provider API
```

Client applications call the payment service to create checkouts and read payment status. The payment service creates provider checkout sessions, owns success/cancel callback URLs, refreshes provider state on browser return where possible, and redirects the browser back to the registered client callback URL with canonical payment query parameters.

Client applications should not call Stripe/PayPal directly and should not build provider success or cancel URLs.

## Providers

Stripe cards and PayPal wallet payments are the v1 providers. Braintree and Adyen are future candidates and are not configured for this MVP.

The current adapters are deterministic local implementations that normalize provider IDs, raw statuses, next actions, captures, cancellations, refunds, and webhook parsing without requiring live sandbox credentials.

## Development

```bash
go test ./...
go run ./cmd/api
```

Run the live Stripe sandbox API e2e against a running local payment service:

```bash
npm run payments:test:e2e
```

The e2e test reads `PAYMENT_GATEWAY_API_KEY` or `STRIPE_SECRET_KEY` from the environment or the root `.env`, calls `POST /v1/checkouts`, verifies that the payment API returns a real Stripe Checkout URL, then retrieves the Checkout Session from Stripe and asserts it is a sandbox session.

OpenAPI source lives at `docs/api/OpenApi.yaml`. SQL migrations live under `migrations/`: `001_core_schema.sql` is the entrypoint, table definitions are split one table per file in `migrations/tables`, and stored routines are split one function or procedure per file under `migrations/functions` and `migrations/procedures`. Routine names and routine filenames use camelCase after their ordering prefix, for example `001_paymentGet.sql` and `001_paymentClientUpsert.sql`.

Payment data access follows a database-first contract: application repositories must use functions for reads and stored procedures for writes, leaving direct table CRUD to migrations only.
