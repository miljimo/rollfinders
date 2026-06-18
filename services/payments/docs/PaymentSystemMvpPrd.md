# Payment System MVP PRD

## 1. Summary

Build a self-hosted payment service written in Go that exposes versioned JSON APIs for other services to create, track, capture, cancel, and refund payments. The MVP supports one-time payments through cards and PayPal while keeping provider-specific details behind clean adapter interfaces.

The first implementation uses Stripe PaymentIntents for card payments and PayPal Orders approval/capture for PayPal wallet payments. Visa, Mastercard, credit cards, and debit cards are modeled under the `card` payment method, with card network and funding type stored as metadata when the provider returns them. Braintree and Adyen are intentionally deferred from the MVP because they increase implementation and operational complexity before the product has validated demand.

The service must not collect or store raw card numbers or CVV. Card entry and tokenization happen through provider-hosted or provider-SDK flows, keeping the Go API focused on orchestration, status tracking, idempotency, refunds, and webhooks.

## 2. Goals

- Provide a clean JSON API that other internal or external services can integrate without knowing Stripe or PayPal internals.
- Run as a container-based, platform-agnostic service that can be deployed to Docker, Kubernetes, cloud container platforms, or self-managed Linux hosts.
- Keep application instances stateless so they can be scaled horizontally without sticky sessions or local persistent disk.
- Support one-time card and PayPal payments for an MVP launch.
- Use Stripe as the first card provider and PayPal direct as the PayPal wallet provider.
- Document why Braintree and Adyen are not part of v1, including pricing transparency, implementation difficulty, and operational tradeoffs.
- Support full and partial refunds.
- Track canonical payment status independently from provider-specific statuses.
- Make all money-moving operations idempotent.
- Provide provider webhook handling with signature verification and duplicate-event protection.
- Keep PCI scope low by accepting only provider tokens, provider payment IDs, redirect URLs, or client secrets.
- Produce documentation and OpenAPI contracts suitable for integration by another service.

## 3. Non-Goals

- No raw PAN, CVV, or direct card vaulting.
- No subscriptions, invoices, recurring billing, tax, disputes, marketplace split payments, or multi-capture in v1.
- No admin dashboard in the product MVP.
- No advanced fraud engine or machine-learning risk scoring.
- No automatic multi-provider routing or failover in v1.
- No Braintree or Adyen integration in v1.
- No hosted SaaS account system in v1.
- No local filesystem dependency for durable payment state, sessions, or provider event processing.

## 4. Target Users

- Developers building applications that need a reusable payment backend.
- Small teams that want payment logic isolated from order, cart, or product services.
- Agencies or product teams that expect to reuse the same payment service across multiple projects.

## 5. Service Boundary

The payment service owns:

- Payment creation and provider orchestration.
- Payment status tracking.
- Capture, cancellation, and refund operations.
- Provider webhook ingestion and normalization.
- Payment and refund audit history.
- Idempotency for mutating operations.

The payment service does not own:

- Shopping carts.
- Orders.
- Products.
- Customer accounts.
- Fulfillment.
- Entitlements.
- Pricing plans.
- Marketing site users or SaaS billing for this service.

## 6. MVP Functional Requirements

### Payment Methods

- Support `card`, `google_pay`, and `paypal` as first-class payment method types.
- For cards, support Stripe-tokenized credit and debit cards, including Visa and Mastercard networks.
- For Google Pay, accept `payment_method_type: "google_pay"` with the Stripe provider and map hosted Stripe Checkout requests onto Stripe's `card` payment method type, because Stripe presents Google Pay through wallet-enabled card rails.
- Use Stripe.js or Stripe-hosted/provider SDK collection so raw card data never passes through this Go backend.
- Create and confirm Stripe PaymentIntents from the backend. Treat `requires_action` and `processing` as normal non-terminal states, not failures.
- Store card network, funding type, last four digits, and expiry only when returned by the provider and safe to store.
- For PayPal, use PayPal Orders to create an order, return an approval action, capture after approval, and reconcile status through PayPal webhooks.

### Payment Operations

- Create a payment.
- Retrieve a payment by ID.
- Capture a manually authorized card payment.
- Cancel an uncaptured or pending payment.
- Create full or partial refunds.
- List refunds for a payment.
- Receive provider webhooks.

### Payment Statuses

Use these canonical payment statuses:

- `created`
- `requires_action`
- `processing`
- `authorized`
- `succeeded`
- `failed`
- `cancelled`
- `partially_refunded`
- `refunded`

Store provider-specific status separately as `provider_status`, with optional `provider_error_code` and `provider_error_message`.

### Refund Statuses

Use these canonical refund statuses:

- `pending`
- `succeeded`
- `failed`
- `cancelled`

Refund creation must not assume provider success. The service must tolerate refunds that complete asynchronously through webhooks.

### Idempotency

- Require an `Idempotency-Key` header for:
  - `POST /v1/payments`
  - `POST /v1/payments/{id}/capture`
  - `POST /v1/payments/{id}/cancel`
  - `POST /v1/payments/{id}/refunds`
- Store request hash, response body, HTTP status, resource ID, and expiry for each idempotency key.
- Pass provider idempotency keys to Stripe and PayPal where supported, in addition to enforcing service-level idempotency.
- Return the original response when a key is replayed with the same request body.
- Return `409 idempotency_conflict` when the same key is replayed with a different request body.

### Webhooks

- Expose provider webhook endpoints by provider.
- Verify signatures before processing.
- Store provider event ID, event type, raw payload, processing status, and timestamps.
- Make webhook processing idempotent.
- Tolerate duplicate and out-of-order webhook delivery.

## 7. MVP API Contract

All APIs use JSON and versioned `/v1` routes.

### Create Payment

`POST /v1/payments`

Required header: `Idempotency-Key`

Example request:

```json
{
  "amount": 1299,
  "currency": "GBP",
  "payment_method_type": "card",
  "provider": "stripe",
  "capture_method": "automatic",
  "external_reference": "order_123",
  "metadata": {
    "order_id": "order_123"
  }
}
```

Example response:

```json
{
  "id": "pay_123",
  "status": "requires_action",
  "amount": 1299,
  "currency": "GBP",
  "payment_method_type": "card",
  "provider": "stripe",
  "client_secret": "provider_client_secret",
  "next_action": {
    "type": "redirect",
    "url": "https://provider.example/approve"
  },
  "external_reference": "order_123",
  "created_at": "2026-06-07T14:00:00Z",
  "updated_at": "2026-06-07T14:00:00Z"
}
```

### Other MVP Endpoints

- `GET /v1/payments/{id}`
- `POST /v1/payments/{id}/capture`
- `POST /v1/payments/{id}/cancel`
- `POST /v1/payments/{id}/refunds`
- `GET /v1/payments/{id}/refunds`
- `POST /v1/webhooks/stripe`
- `POST /v1/webhooks/paypal`

### Error Shape

```json
{
  "error": {
    "code": "payment_declined",
    "message": "The payment was declined.",
    "request_id": "req_123"
  }
}
```

Minimum stable error codes:

- `validation_error`
- `authentication_error`
- `authorization_error`
- `idempotency_conflict`
- `payment_not_found`
- `payment_invalid_state`
- `payment_declined`
- `authentication_required`
- `provider_unavailable`
- `provider_error`
- `internal_error`

## 8. Technical Requirements

### Provider Choice and Tradeoffs

The MVP provider decision is:

- Stripe for card payments through PaymentIntents.
- PayPal direct for PayPal wallet payments through Orders approval/capture.
- Braintree deferred unless the product later needs one PayPal-owned platform for both cards and PayPal wallet.
- Adyen deferred until the product has higher volume, more international payment-method needs, or enterprise reporting/commercial requirements.

Current UK commercial assumptions for planning:

| Provider | MVP Role | Pricing Shape | Implementation Difficulty | Decision |
|---|---|---:|---|---|
| Stripe | Card payments | Standard UK cards 1.5% + 20p, premium UK cards 1.9% + 20p, EEA cards 2.5% + 20p, international cards 3.25% + 20p, disputes 20 GBP | Low-medium | Use in v1 |
| PayPal direct | PayPal wallet | Official fees are product-specific and less simple to compare directly | Medium | Use in v1 for PayPal only |
| Braintree | Possible future cards + PayPal consolidation | UK standard cards/digital wallets around 1.9% + 20p, Amex around 2.4% + 20p, extra international charges may apply | Medium-high | Defer |
| Adyen | Future scale/enterprise provider | Interchange++ plus method-specific processing fees | High | Defer |

Rationale:

- Stripe has the simplest MVP path for card payments, strong docs, mature webhooks, good Go SDK support, clear PaymentIntent lifecycle, and transparent standard pricing.
- PayPal direct keeps PayPal wallet support without forcing all card processing through PayPal/Braintree.
- Braintree is useful later if provider consolidation matters more than fastest MVP delivery.
- Adyen is powerful but better suited to larger, multi-market, enterprise-style payment operations.

### Architecture

- Package and run the service as a container image. The same image should run in local Docker, Kubernetes, managed container platforms, or VM-based container runtimes.
- Keep the HTTP service stateless. Durable state belongs in PostgreSQL, provider systems, object/secret stores, or external queues/outbox consumers, not in process memory or local disk.
- Support horizontal scaling across multiple identical service instances. Use database constraints, transactions, row-level locks, and idempotency records to coordinate concurrent requests.
- Read configuration from environment variables or mounted secrets so deployments remain platform agnostic.
- Do not treat Stripe and PayPal as identical flows. Normalize internal status and common commands, while allowing provider-specific lifecycle details at the adapter edge.
- For Stripe, the backend creates and confirms PaymentIntents; the frontend uses Stripe.js for card collection and customer actions.
- For PayPal, the backend creates Orders, returns approval actions, captures approved orders, and reconciles through webhooks.
- Fulfillment by downstream services must depend on backend-confirmed payment status, preferably webhook-confirmed `succeeded`, not frontend redirect status.
- Implement the service in Go.
- Use a layered structure with HTTP handlers, service/business logic, persistence, and provider adapters.
- Keep provider-specific mapping inside Stripe and PayPal adapters.
- Keep canonical validation, idempotency, persistence, status transitions, and audit history in the service layer.
- Publish an OpenAPI spec as the integration contract.

### Provider Interface

The provider boundary should support:

- Create or confirm provider payment intent/order.
- Create payment.
- Capture payment.
- Cancel payment.
- Refund payment.
- Parse and verify webhook.
- Normalize provider errors and statuses.

### Storage

Use PostgreSQL for the MVP.

Core tables:

- `payments`
- `refunds`
- `provider_events`
- `idempotency_keys`
- `payment_status_history`
- `outbox_events`

Store money as integer minor units plus ISO currency code. Never use floats for payment amounts. Use row-level locking around capture, cancel, refund, and reconciliation updates so concurrent money-moving operations cannot corrupt state.

### Security and Compliance

- Container images must not contain provider secrets, private keys, or environment-specific configuration.
- Runtime secrets must come from environment variables, mounted secrets, or a secret manager.
- Do not accept raw card numbers or CVV.
- Redact secrets, tokens, authorization headers, and payment-sensitive data from logs.
- Use TLS in deployed environments.
- Store provider API secrets outside source control through environment variables or a secret manager.
- Treat metadata as untrusted input.
- Keep audit history for money-moving actions.
- Authenticate API callers with an internal API key or JWT in MVP.

### Observability

Operational tooling should include webhook replay, reconciliation for uncertain provider states, and alerts for repeated provider errors or failed webhook processing. Store provider request IDs when returned by Stripe or PayPal.

Structured logs must include:

- `request_id`
- `payment_id`
- `external_reference`
- `provider`
- `provider_payment_id`
- `idempotency_key`

Minimum metrics:

- Payment creation count.
- Payment success/failure count.
- Provider latency.
- Provider error rate.
- Webhook processing success/failure.
- Refund success/failure.
- Webhook lag and failed webhook processing.
- Outbox lag and event publish failures.

## 9. Acceptance Criteria

- A caller can create a card payment and receive a canonical payment response.
- A caller can create a PayPal payment and receive an approval `next_action`.
- A caller can retrieve payment status through the API.
- A caller can refund a succeeded payment fully or partially.
- Duplicate payment creation requests with the same idempotency key do not create duplicate provider charges.
- Duplicate provider webhooks do not duplicate state transitions.
- Provider errors are mapped to stable service error codes.
- No endpoint accepts raw card number or CVV.
- OpenAPI documentation describes all MVP endpoints, request bodies, response bodies, and error shapes.

## 10. Test Plan

- Unit tests for status transitions, validation, idempotency replay, idempotency conflict, and provider error mapping.
- Unit tests for refund edge cases, including partial refunds and over-refund prevention.
- Adapter tests using mocked Stripe PaymentIntent and PayPal Order responses.
- Webhook tests for signature verification, duplicate delivery, unknown event type, out-of-order delivery, and replay.
- Integration tests for database persistence, transactional idempotency, row-level locking, and concurrent capture/refund attempts.
- Contract tests against the OpenAPI schema.
- Sandbox end-to-end tests for successful card payment, declined card payment, PayPal approval flow, refund, and duplicate webhook.

## 11. Product MVP Milestones

### Milestone 1: Contract and Skeleton

- Go service skeleton.
- Health endpoint.
- JSON error model.
- OpenAPI draft.
- PostgreSQL schema migrations.
- Provider adapter interfaces.

### Milestone 2: Card Payment Flow

- Stripe PaymentIntent creation and confirmation.
- Automatic capture.
- Manual capture support.
- Payment retrieval.
- Idempotency for create and capture.

### Milestone 3: PayPal Flow

- PayPal Order creation.
- Approval redirect response.
- Capture after approval.
- PayPal webhook handling.

### Milestone 4: Refunds and Webhooks

- Full and partial refunds.
- Stripe webhook handling.
- Provider event audit storage.
- Payment status history.

### Milestone 5: Integration Readiness

- OpenAPI finalization.
- Example requests.
- Sandbox setup guide.
- Operational logging and basic metrics.
- Security review against PCI-minimizing constraints.

## 12. Marketing MVPs

### Marketing MVP A: Developer-First Launch

Goal: Validate whether developers want a reusable payment backend service.

Assets:

- Landing page focused on clean Go payment APIs.
- Quickstart documentation.
- Example integration repository.
- Technical article about avoiding payment webhook and idempotency bugs.
- Waitlist or demo CTA.

Channels:

- GitHub.
- Hacker News.
- Reddit developer communities.
- Indie Hackers.
- Technical blog posts.

Success metrics:

- 5-10% landing-page waitlist conversion.
- 10-15% docs-to-signup or docs-to-waitlist conversion.
- Developers can complete a sandbox payment in under 15 minutes.
- At least 3 design partners agree to test the service.

### Marketing MVP B: Agency Reuse Launch

Goal: Validate whether agencies value a reusable payment backend across client projects.

Assets:

- Agency-focused landing page.
- Reusable architecture diagram.
- ROI calculator showing time saved per project.
- Demo app showing one-time payment and refund flow.
- Outreach message for development agencies.

Channels:

- Direct outreach to agencies.
- LinkedIn founder/developer posts.
- Agency communities.
- Existing freelance or agency networks.

Success metrics:

- 30-50 agency outreach conversations.
- 5 qualified demos.
- 2 agencies willing to use it in a client prototype.
- Clear evidence that reuse across projects is a buying driver.

### Marketing MVP C: Self-Hosted Open-Core Funnel

Goal: Build trust by giving developers a useful self-hosted starter while validating demand for paid support, hosted operations, or admin tooling later.

Assets:

- Public repository with the self-hosted payment service.
- Installation guide.
- Stripe and PayPal sandbox setup guide.
- Roadmap for hosted/admin features.
- Optional paid support or design-partner CTA.

Channels:

- GitHub.
- Developer newsletters.
- Technical tutorials.
- Open-source directories.

Success metrics:

- Repository stars, forks, and issue engagement.
- Setup guide completion feedback.
- At least 3 users ask for hosted/admin/support features.
- At least 1 design partner willing to pay for implementation help or hosted operations.

### Marketing MVP D: Hosted Future Validation

Goal: Test whether a hosted SaaS layer is worth building after the self-hosted MVP.

Assets:

- Landing page section for hosted payment operations.
- Pricing signal for hosted deployment, monitoring, and admin UI.
- Demo booking CTA.
- Short demo video showing payment status and webhook visibility.

Channels:

- Existing users of the self-hosted version.
- Design partners.
- Small SaaS founders.
- Agencies that do not want to operate payment infrastructure themselves.

Success metrics:

- 3+ users willing to pay or sign letters of intent.
- Repeated requests for admin dashboard, webhook logs, monitoring, or managed hosting.
- Clear willingness to pay beyond a thin wrapper over Stripe and PayPal.

## 13. Risks

- Modeling Visa, Mastercard, credit, and debit as separate payment methods would create incorrect domain boundaries.
- Missing service-level and provider-level idempotency can cause duplicate charges or refunds.
- Webhooks can arrive late, duplicated, or out of order.
- Provider-specific statuses can leak into the public contract if not normalized carefully. Stripe and PayPal should share canonical statuses, not identical internal flows.
- Refunds can be asynchronous and may fail after being requested. Original processing fees are often not returned on refunds, so accounting must not assume gross refund equals merchant cost reversal.
- Logging request bodies can accidentally expand PCI or privacy scope.
- Building subscriptions or dashboards too early can slow validation of the core payment API.
- Positioning too directly against Stripe or PayPal may confuse buyers; the service should be positioned as integration infrastructure around providers.

## 14. Assumptions

- The MVP is self-hosted.
- The service is container-based, platform agnostic, and stateless at the application layer.
- The API is consumed by other services, not directly by end-user browsers except through provider client secrets or redirect flows.
- Stripe PaymentIntents are the first card payment implementation.
- PayPal is supported through PayPal Orders approval/capture.
- Braintree and Adyen are future provider candidates, not MVP dependencies.
- First market validation focuses on developers and agencies.
- Subscriptions, invoices, admin dashboard, hosted SaaS accounts, and advanced fraud tooling are future roadmap items.
