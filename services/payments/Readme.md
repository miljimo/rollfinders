# Payment System

Self-hosted Go JSON API for the Payment System MVP. The service supports local one-time Stripe card and PayPal wallet flows through provider adapters, idempotent payment operations, refunds, webhook ingestion, outbox records, and Prometheus-style metrics.

The backend never accepts raw card PAN or CVV fields. Stripe.js, PayPal approval, or another hosted client-side collection flow should collect sensitive payment details.

## Quickstart

```bash
docker compose up --build
```

The compose stack starts PostgreSQL, initializes `migrations/001_core_schema.sql`, and runs the API with `API_KEY=local-dev-key`.

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

Create a Stripe card payment:

```bash
curl -s http://localhost:8080/v1/payments \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-demo-1' \
  -d '{"amount":1299,"currency":"GBP","provider":"stripe","payment_method_type":"card","capture_method":"automatic","metadata":{"order_id":"ord_123"}}'
```

Create a PayPal wallet payment:

```bash
curl -s http://localhost:8080/v1/payments \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-demo-2' \
  -d '{"amount":1299,"currency":"GBP","provider":"paypal","payment_method_type":"paypal"}'
```

Refund a payment:

```bash
curl -s http://localhost:8080/v1/payments/pay_000001/refunds \
  -H 'Authorization: Bearer local-dev-key' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: refund-demo-1' \
  -d '{"amount":500,"reason":"requested_by_customer"}'
```

Send a local Stripe-style webhook:

```bash
curl -s http://localhost:8080/v1/webhooks/stripe \
  -H 'Content-Type: application/json' \
  -H 'Stripe-Signature: test-signature' \
  -d '{"id":"evt_demo_1","payment_id":"pay_000001","status":"succeeded","type":"payment_intent.succeeded"}'
```

## Configuration

The service reads configuration from environment variables only.

- `PORT`, default `8080`
- `DATABASE_URL`, required for `/readyz`
- `API_KEY`, required for protected payment/refund/status endpoints and `/readyz`
- `METRICS_ENABLED`, default `true`; set to `false` to hide `/metrics`
- `READ_TIMEOUT`, default `5s`
- `WRITE_TIMEOUT`, default `10s`
- `SHUTDOWN_TIMEOUT`, default `10s`
- `STRIPE_SECRET_KEY`, future live Stripe credential
- `STRIPE_WEBHOOK_SECRET`, future live Stripe webhook verification secret
- `PAYPAL_CLIENT_ID`, future live PayPal credential
- `PAYPAL_CLIENT_SECRET`, future live PayPal credential
- `PAYPAL_WEBHOOK_ID`, future live PayPal webhook verification identifier

If `DATABASE_URL` or `API_KEY` is missing, `/readyz` returns `503` with a clear reason. Protected endpoints return `401` when credentials are missing or invalid.

## Idempotency

Money-moving mutating endpoints require `Idempotency-Key`:

- `POST /v1/payments`
- `POST /v1/payments/{id}/capture`
- `POST /v1/payments/{id}/cancel`
- `POST /v1/payments/{id}/refunds`

Retrying the same key with the same request body returns the original response with `Idempotent-Replayed: true`. Reusing the same key for a different request returns `409 idempotency_conflict`.

## Providers

Stripe cards and PayPal wallet payments are the v1 providers. Braintree and Adyen are future candidates and are not configured for this MVP.

The current adapters are deterministic local implementations that normalize provider IDs, raw statuses, next actions, captures, cancellations, refunds, and webhook parsing without requiring live sandbox credentials.

## Development

```bash
go test ./...
go run ./cmd/api
```

OpenAPI source lives at `docs/api/OpenApi.yaml`. SQL schema lives at `migrations/001_core_schema.sql`.
