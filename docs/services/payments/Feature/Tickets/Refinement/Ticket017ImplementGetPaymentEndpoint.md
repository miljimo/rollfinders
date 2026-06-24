# 017 - Implement Get Payment Endpoint

## Feature / Component

- Feature: Payment APIs
- Component: GET /v1/payments/{id}
- Priority: P0
- Suggested owner: Backend Engineer
- Dependencies: Ticket008ImplementRepositoryLayer, Ticket009ImplementPaymentStateMachine, Ticket013ImplementApiAuthentication

## Task

Expose current local payment state to integrators through a stable JSON response.

## Implementation Notes

- Return latest known local state.
- Do not block the request on provider lookup unless a future explicit refresh feature is added.
- Omit internal-only fields and secrets.

## Acceptance Criteria

- WHEN an existing payment ID is requested, THEN the API returns payment ID, amount, currency, provider, status, timestamps, and metadata.
- IF the payment does not exist, THEN the API returns `404`.
- WHEN provider metadata exists, THEN only safe public provider fields are included.
- IF the request is unauthorized, THEN payment details are not returned.
- WHEN the response is returned, THEN it matches the OpenAPI schema.

## Out Of Scope

Search, reporting, analytics, admin dashboard.
