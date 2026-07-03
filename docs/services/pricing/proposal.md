# PRD: Pricing Policy Service

**Product:** RollFinders

**Service:** Pricing Policy Service

**Status:** Proposal

**Last updated:** 2026-07-03

---

## Purpose

The Pricing Policy Service owns commercial pricing rules used to calculate RollFinders platform fees and future discounts, promotions, and fee waivers.

The first implementation slice is intentionally small:

* Store the active platform fee policy.
* Let authorised operators update the platform fee percentage and fixed fee.
* Let other backend code read the active platform fee policy.
* Support different active platform fee policies per provider account/configuration.

The service must be designed so future promo codes, discounts, academy-specific pricing, user-specific concessions, and subscription-plan pricing reductions can be added without pushing that domain into Payments.

---

## Product Goal

RollFinders needs a permission-controlled way to manage the fixed platform fee and percentage platform fee used when calculating payment fees.

Fees may differ by provider account/configuration. The service must therefore track the concrete provider identifier used for the payment path.

Examples:

| Provider ID | Meaning |
| --- | --- |
| `rollfinders-stripe-platform` | RollFinders platform Stripe account/provider record. |
| `acct_123` | Stripe Connect account/provider record. |
| `bank_provider_default` | Future bank account provider configuration. |
| `paypal_provider_default` | Future PayPal provider configuration. |

This must no longer be treated as Stripe account setup in Payment Settings. Stripe/provider account linking belongs to Wallet-linked external accounts. Pricing policy belongs to its own service because it will later control commercial pricing rules beyond payment provider setup.

---

## Service Boundary

### Pricing Policy Service Owns

* Platform fee policy records.
* Provider-ID-scoped fee policy records.
* Policy versioning.
* Active policy selection.
* Policy validation.
* Policy audit metadata.
* Fee calculation rules for RollFinders platform fees.
* Future promotion, discount, waiver, and campaign rule records.

### Pricing Policy Service Does Not Own

* Payment processing.
* Stripe checkout.
* Stripe Connect onboarding.
* Provider account linking.
* Wallet balances.
* Ledger entries.
* Transfer workflow records.
* Authorisation decisions.
* User identity.
* Academy ownership data.
* Subscription product catalogue.

### Related Service Boundaries

Payment Service owns payment provider facts, checkout records, payment records, refunds, and provider webhook state. It may consume Pricing Policy Service results when calculating expected fees, but it must not own promotion or fee-policy configuration long-term.

Wallet Service owns wallets, linked external wallet accounts, balances, and ledger entries. It must not calculate commercial pricing policy.

Transfer Service owns transfer workflow records. It must not calculate platform fee policy.

Authorisation Service owns permissions and role assignments. Pricing Policy Service must not authenticate or authorise callers. The API/gateway layer enforces permissions before calling the service.

Subscription Service owns plans, subscriptions, and entitlements. Future plan-based pricing rules may reference plan identifiers, but Pricing Policy Service must not own subscription lifecycle.

---

## MVP Scope

The MVP implements platform fee policy only.

### MVP Capabilities

* Read the active platform fee policy.
* Update the active platform fee policy.
* Validate fixed fee and percentage values.
* Keep previous policy versions immutable.
* Return the currently active policy.
* Expose a fee preview/calculation endpoint.
* Publish an outbox event when the active policy changes.

### MVP Exclusions

* Promo code creation.
* Discount campaigns.
* Academy-specific overrides.
* User-specific overrides.
* Subscription-plan-specific fee reductions.
* Approval workflow.
* Scheduling future effective dates.
* Multi-currency conversion.
* Tax calculation.
* Stripe/provider account setup.

---

## Permissions

The API/gateway layer must enforce permissions before calling Pricing Policy Service.

Pricing Policy Service must trust caller context and must not implement authentication or authorisation internally.

### MVP Permissions

| Permission | Purpose |
| --- | --- |
| `pricing.policy.read`   | Allows reading active platform fee policy and fee previews. |
| `pricing.policy.update` | Allows updating active platform fee policy. |
| `pricing.policy.create` | Allows updating active platform fee policy. |
| `pricing.policy.delete` | Allows updating active platform fee policy. |
### Future Permissions

| Permission | Purpose |
| --- | --- |
| `pricing.promotion.create` | Allows creating promo codes or campaigns. |
| `pricing.promotion.update` | Allows editing promo codes or campaigns. |
| `pricing.promotion.disable` | Allows disabling promo codes or campaigns. |
| `pricing.discount.approve` | Allows approving manual or high-impact discounts. |

Super Admin should receive all pricing permissions through Authorisation seed data.

---

## Domain Model

### Platform Fee Policy

A Platform Fee Policy defines the RollFinders platform fee for a specific provider identifier.

Provider ID scoping is required because Stripe, bank transfer, card, PayPal, and future provider records may have different platform fee rules.

Fields:

| Field | Type | Required | Notes |
| --- | --- | ---: | --- |
| `id` | string | yes | Generated `ppol_...` identifier. |
| `policy_type` | enum | yes | MVP value: `PLATFORM_FEE`. |
| `provider_id` | string | yes | Concrete provider/account/config identifier. Example: `rollfinders-stripe-platform` or `acct_123`. |
| `percentage_basis_points` | integer | yes | `500` means `5%`. |
| `fixed_amount_minor` | integer | yes | Minor units, for example pence. |
| `currency` | string | yes | MVP value: `GBP`. |
| `status` | enum | yes | `ACTIVE`, `INACTIVE`. |
| `version` | integer | yes | Monotonic policy version. |
| `created_by` | string | no | Actor user id supplied by API/gateway. |
| `updated_by` | string | no | Actor user id supplied by API/gateway. |
| `created_at` | timestamp | yes | UTC. |
| `updated_at` | timestamp | yes | UTC. |

### Policy Status

* `ACTIVE`
* `INACTIVE`

Only one `ACTIVE` policy may exist for the same `policy_type`, `provider_id`, and `currency`.

### Policy Type

MVP:

* `PLATFORM_FEE`

Future:

* `PROMOTION`
* `DISCOUNT`
* `FEE_WAIVER`
* `CAMPAIGN`

### Provider ID

`provider_id` identifies the exact provider account or provider configuration the fee policy applies to.

Pricing Policy Service must not duplicate provider family, Stripe account metadata, wallet linked-account metadata, or provider setup state. Callers that need provider details should resolve them from Wallet-linked account records or provider records.

Examples:

* `provider_id = rollfinders-stripe-platform`
* `provider_id = acct_1Tm3DXElAA2JvGBv`
* `provider_id = bank_provider_default`

The service must treat provider IDs as opaque strings. It must not call Stripe, Wallet, Payment, or Bank services to validate the provider ID.

---

## Fee Calculation Rules

Inputs:

* Payment amount in minor units.
* Provider ID.
* Currency.
* Active platform fee policy.

Formula:

```txt
percentage_fee_minor = floor(payment_amount_minor * percentage_basis_points / 10000)
platform_fee_minor = percentage_fee_minor + fixed_amount_minor
platform_fee_minor = min(platform_fee_minor, payment_amount_minor)
net_amount_minor = payment_amount_minor - platform_fee_minor
```

Validation:

* Payment amount must be greater than or equal to zero.
* Provider ID must be present.
* Currency must match the policy currency.
* Percentage basis points must be between `0` and `10000`.
* Fixed amount minor must be greater than or equal to `0`.
* Platform fee must never exceed payment amount.

Rounding:

* Use integer minor units only.
* Percentage fee uses floor rounding.
* Never use floating point arithmetic for persisted monetary values.

---

## API Contract

All routes are service routes. Public/dashboard routes should call through the API/gateway layer after permission checks.

### Get Active Platform Fee Policy

```txt
GET /v1/pricing/policies/platform-fee?provider_id=rollfinders-stripe-platform&currency=GBP
```

Response:

```json
{
  "policy": {
    "id": "ppol_123",
    "policy_type": "PLATFORM_FEE",
    "provider_id": "rollfinders-stripe-platform",
    "percentage_basis_points": 500,
    "fixed_amount_minor": 100,
    "currency": "GBP",
    "status": "ACTIVE",
    "version": 3,
    "created_by": "user_123",
    "updated_by": "user_456",
    "created_at": "2026-07-03T10:00:00Z",
    "updated_at": "2026-07-03T12:00:00Z"
  }
}
```

If no provider-account-specific active policy exists, service may return an active default provider policy when one exists:

```json
{
  "policy": {
    "id": "ppol_default_stripe_platform_fee_gbp",
    "policy_type": "PLATFORM_FEE",
    "provider_id": "rollfinders-stripe-platform",
    "percentage_basis_points": 500,
    "fixed_amount_minor": 100,
    "currency": "GBP",
    "status": "ACTIVE",
    "version": 1
  }
}
```

Provider defaults may be seeded in the database. Runtime code should not depend on hardcoded defaults once migrations have run.

If a provider-specific policy does not exist, the service may fall back to a default policy only when an active default policy exists for:

```txt
provider_id = <default provider id>
currency = <requested currency>
```

The response must include the actual policy id and provider id used so callers know whether a provider-account-specific policy or default policy was applied.

### Update Active Platform Fee Policy

```txt
PUT /v1/pricing/policies/platform-fee
```

Request:

```json
{
  "provider_id": "rollfinders-stripe-platform",
  "percentage_basis_points": 500,
  "fixed_amount_minor": 100,
  "currency": "GBP"
}
```

Required caller context headers from API/gateway:

```txt
X-Actor-User-ID: <user id>
```

Response:

```json
{
  "policy": {
    "id": "ppol_456",
    "policy_type": "PLATFORM_FEE",
    "provider_id": "rollfinders-stripe-platform",
    "percentage_basis_points": 500,
    "fixed_amount_minor": 100,
    "currency": "GBP",
    "status": "ACTIVE",
    "version": 4,
    "created_by": "user_123",
    "updated_by": "user_123",
    "created_at": "2026-07-03T13:00:00Z",
    "updated_at": "2026-07-03T13:00:00Z"
  }
}
```

Update behavior:

1. Validate request.
2. Mark the current active `PLATFORM_FEE` policy for the same provider ID and currency as `INACTIVE`.
3. Insert a new `ACTIVE` policy with version incremented by one.
4. Insert an outbox event.
5. Return the new active policy.

The service must not mutate previous policy values.

### Preview Platform Fee

```txt
POST /v1/pricing/policies/platform-fee/preview
```

Request:

```json
{
  "amount_minor": 10000,
  "provider_id": "rollfinders-stripe-platform",
  "currency": "GBP"
}
```

Response:

```json
{
  "preview": {
    "amount_minor": 10000,
    "provider_id": "rollfinders-stripe-platform",
    "currency": "GBP",
    "percentage_basis_points": 500,
    "fixed_amount_minor": 100,
    "percentage_fee_minor": 500,
    "platform_fee_minor": 600,
    "net_amount_minor": 9400,
    "policy_id": "ppol_456",
    "policy_version": 4
  }
}
```

---

## Database Design

Schema:

```txt
pricing
```

Tables:

```sql
pricing.pricing_policies
```

Columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | Generated policy id. |
| `policy_type` | text | `PLATFORM_FEE`. |
| `provider_id` | text | Concrete provider/account/config identifier. |
| `percentage_basis_points` | integer | Range `0..10000`. |
| `fixed_amount_minor` | bigint | Must be `>= 0`. |
| `currency` | text | MVP: `GBP`. |
| `status` | text | `ACTIVE`, `INACTIVE`. |
| `version` | integer | Monotonic per policy type, provider ID, and currency. |
| `created_by` | text | Optional actor user id. |
| `updated_by` | text | Optional actor user id. |
| `created_at` | timestamptz | Not null. |
| `updated_at` | timestamptz | Not null. |

Constraints:

* `policy_type IN ('PLATFORM_FEE')` for MVP.
* `provider_id <> ''`.
* `status IN ('ACTIVE', 'INACTIVE')`.
* `percentage_basis_points BETWEEN 0 AND 10000`.
* `fixed_amount_minor >= 0`.
* `currency IN ('GBP')` for MVP.
* Unique active policy per `policy_type`, `provider_id`, `currency`.

Recommended partial unique index:

```sql
CREATE UNIQUE INDEX pricing_policies_active_unique
ON pricing.pricing_policies(policy_type, provider_id, currency)
WHERE status = 'ACTIVE';
```

Outbox:

```sql
pricing.outbox_events
```

Use the existing service outbox pattern.

---

## Stored Procedures and Functions

The service must not use inline SQL in runtime Go code.

All runtime database access must call stored functions/procedures from the `pricing` schema.

MVP functions:

```txt
pricing.get_active_platform_fee_policy(
  p_provider_id text,
  p_currency text
)
pricing.update_platform_fee_policy(
  p_provider_id text,
  p_percentage_basis_points integer,
  p_fixed_amount_minor bigint,
  p_currency text,
  p_actor_user_id text
)
pricing.preview_platform_fee(
  p_amount_minor bigint,
  p_provider_id text,
  p_currency text
)
```

The update function must:

* Run atomically.
* Lock the active policy row or use transaction-safe replacement.
* Inactivate the previous active policy for the same provider ID and currency.
* Insert the new active policy.
* Insert an outbox event.
* Return the new active policy row.

---

## Events

### `pricing.platform_fee_policy.updated`

Payload:

```json
{
  "policy_id": "ppol_456",
  "policy_type": "PLATFORM_FEE",
  "provider_id": "rollfinders-stripe-platform",
  "currency": "GBP",
  "percentage_basis_points": 500,
  "fixed_amount_minor": 100,
  "version": 4,
  "updated_by": "user_123",
  "updated_at": "2026-07-03T13:00:00Z"
}
```

Events are for cache invalidation, audit pipelines, and future asynchronous consumers. Payment calculation must still read the active policy or receive a policy result from orchestration.

---

## Backend Implementation Requirements

Create the service under:

```txt
apps/backend_api/internal/services/pricing/
```

Required structure:

```txt
apps/backend_api/internal/services/pricing/
  Server.go
  README.md

  bootstrap/
    Bootstrap.go
    utils.go

  dataaccess/
    constants.go
    errors.go
    utils.go
    GetActivePlatformFeePolicy.go
    UpdatePlatformFeePolicy.go
    PreviewPlatformFee.go

  domain/
    errors.go
    models.go
    service.go

  endpoints/
    GetActivePlatformFeePolicy.go
    UpdatePlatformFeePolicy.go
    PreviewPlatformFee.go

    request/
      UpdatePlatformFeePolicy.go
      PreviewPlatformFee.go

    response/
      PlatformFeePolicy.go
      PlatformFeePreview.go
```

Rules:

* One public dataaccess function per file.
* One endpoint per file.
* Request objects live in `endpoints/request`.
* Response objects live in `endpoints/response`.
* Domain objects should be used directly where database rows do not differ.
* Reuse core database module.
* Reuse shared handler success/error helpers.
* Do not create an in-memory repository except in test files.
* Do not import another service’s internal package.
* Do not authenticate or authorise inside the service.

---

## API/Gateway Integration Requirements

The API/gateway layer must:

* Register Pricing Service routes under `/v1/pricing`.
* Enforce `pricing.policy.read` for read and preview routes.
* Enforce `pricing.policy.update` for update route.
* Pass actor user id to Pricing Service.
* Keep Super Admin allowed through Authorisation permissions.

Routes:

| Route | Method | Permission |
| --- | --- | --- |
| `/v1/pricing/policies/platform-fee?provider_id=...&currency=...` | GET | `pricing.policy.read` |
| `/v1/pricing/policies/platform-fee` | PUT | `pricing.policy.update` |
| `/v1/pricing/policies/platform-fee/preview` | POST | `pricing.policy.read` |

---

## Portal Integration Requirements

Payment Settings should become a Pricing Policy UI consumer.

Page:

```txt
/dashboard/payment?paymentsView=settings
```

UI behavior:

* Shows current platform fee policy.
* Shows the selected provider account/configuration by display name when available.
* Shows percentage input.
* Shows fixed fee input.
* Shows read-only currency.
* Shows fee preview for a sample payment amount.
* Saves through a server action that calls the API/gateway.
* Requires `pricing.policy.read` to view.
* Requires `pricing.policy.update` to update.
* Does not show Stripe Connect setup.
* Does not disconnect Stripe accounts.
* Does not manage wallet linked accounts.

Initial UI fields:

| Field | Editable | Notes |
| --- | ---: | --- |
| Provider account/configuration | yes | Search/select existing provider or wallet linked-account record. The saved value is `provider_id`. |
| Platform fee percentage | yes | Converts to basis points before sending. |
| Fixed platform fee | yes | Converts pounds to minor units before sending. |
| Currency | no | `GBP` for MVP. |
| Sample payment amount | yes | UI-only value for preview. |

Validation:

* Percentage must be `0..100`.
* Provider ID must not be blank.
* Fixed fee must be `>= 0`.
* Sample amount must be `>= 0`.

---

## Migration From Payment Settings

Current payment platform settings logic should move in phases.

### Phase 1

* Create Pricing Policy Service.
* Seed default active platform fee policy from current payment settings defaults for `provider_id = rollfinders-stripe-platform` and `currency = GBP`.
* Update Payment Settings UI to read and update Pricing Policy Service.
* Keep old payment platform settings read path as fallback only.

### Phase 2

* Remove old payment platform settings storage after production data has migrated.
* Update payment fee calculations to consume Pricing Policy Service.
* Keep payment records immutable. Do not recalculate historical payment records unless explicitly requested by a future migration.

### Phase 3

* Add promo/discount policy tables and APIs.

---

## Future Promotion Model

Do not implement in MVP, but keep schema and service naming compatible.

Future resources:

```txt
pricing_promotions
pricing_promotion_redemptions
pricing_policy_rules
```

Potential rule dimensions:

* Promo code.
* Academy id.
* User id.
* Subscription plan id.
* Date range.
* Minimum payment amount.
* Usage limit.
* First purchase only.

Potential effects:

* Percentage fee reduction.
* Fixed fee reduction.
* Full platform fee waiver.
* Fixed price override.

---

## Acceptance Criteria

* Pricing Service has its own `pricing` schema.
* Pricing Service runtime data access uses stored functions/procedures, not inline SQL.
* `GET /v1/pricing/policies/platform-fee` returns the active policy for the requested provider ID and currency.
* `PUT /v1/pricing/policies/platform-fee` creates a new active policy version and inactivates the previous active policy for the same provider ID and currency.
* `POST /v1/pricing/policies/platform-fee/preview` returns a deterministic fee calculation for the requested provider ID and currency.
* API/gateway checks `pricing.policy.read` and `pricing.policy.update`.
* Super Admin has pricing permissions after seed.
* Payment Settings no longer shows Stripe Connect setup or disconnect controls.
* Payment Settings reads and updates provider-ID-scoped Pricing Policy Service records.
* Existing payment transaction, refund, payout, wallet, and transfer behavior is not broken.

---

## Regression Tests

Backend:

* Create default policy from migration.
* Get active platform fee policy by provider ID and currency.
* Update platform fee policy by provider ID and currency.
* Confirm only one active policy exists after multiple updates for the same provider ID and currency.
* Confirm different provider IDs can have different active fees at the same time.
* Confirm old policies are inactive and immutable.
* Preview fee for `10000 GBP` with `rollfinders-stripe-platform` and `500 bps + 100` returns `600` fee and `9400` net.
* Reject percentage over `10000`.
* Reject blank provider ID.
* Reject negative fixed fee.
* Reject unsupported currency.
* Confirm outbox event is inserted after update.

API/gateway:

* Deny read without `pricing.policy.read`.
* Deny update without `pricing.policy.update`.
* Allow Super Admin with seeded permission.
* Pass actor user id to update.

Portal:

* Payment Settings renders platform fee policy.
* Payment Settings lets authorised users select a provider account/configuration and stores only its provider ID.
* Payment Settings does not render Stripe Connect setup.
* Payment Settings does not render disconnect payment account.
* Save action calls Pricing Policy Service through the API/gateway.
* Validation errors are visible.
* Fee preview updates from sample amount and policy values.

---

## Implementation Tickets

### Ticket 001 - Create Pricing Service Schema And Stored Functions

Create `apps/backend_api/migrations/pricing/` with the `pricing` schema, `pricing_policies`, `outbox_events`, default seed policy, and MVP stored functions.

Acceptance:

* Migrations are idempotent.
* Runtime functions exist.
* Default active `PLATFORM_FEE` policy exists for `provider_id = rollfinders-stripe-platform` and `currency = GBP`.
* Different provider IDs can hold different active platform fee policies.
* No inline SQL is required for service runtime behavior.

### Ticket 002 - Implement Pricing Service Backend

Create `apps/backend_api/internal/services/pricing/` with domain, dataaccess, endpoints, bootstrap, and route registration.

Acceptance:

* Service follows `docs/guidelines/GO_SERVICE.md`.
* Endpoints return request/response objects.
* Dataaccess uses core database module.
* Tests cover get, update, preview, and validation.

### Ticket 003 - Integrate Pricing Routes Into API/Gateway Permissions

Register `/v1/pricing` routes and seed authorisation permissions.

Acceptance:

* `pricing.policy.read` guards get and preview.
* `pricing.policy.update` guards update.
* Super Admin receives all pricing permissions.
* Unauthorized users receive a standard unauthorized response.

### Ticket 004 - Update Payment Settings To Use Pricing Policy Service

Replace current Payment Settings platform-fee storage with Pricing Policy Service calls.

Acceptance:

* Payment Settings reads active pricing policy.
* Save updates the pricing policy through the API/gateway.
* Provider ID is included in read, preview, and update calls.
* Stripe Connect setup and disconnect controls are absent.
* UI shows a sample fee preview.
* Existing payment dashboard views continue to render.

### Ticket 005 - Wire Payment Fee Calculation To Pricing Policy

Update payment fee calculation paths to consume Pricing Policy Service results or API/orchestration-provided pricing policy data.

Acceptance:

* New payment calculations use active pricing policy.
* Historical payment records are not mutated.
* Payment tests cover the default policy and an updated policy.

---

## Open Questions

* Should platform fee changes apply immediately or support a future effective date?
* Should the MVP support academy-specific fee overrides, or should that wait for the promotion/rules phase?
* Should Payment Service call Pricing Policy Service directly, or should the API/orchestration layer pass the pricing result into Payment Service calls?
* Should fee preview be provided by backend only, or can the portal calculate preview locally using the active policy returned by the backend?
