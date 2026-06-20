# 005 - Implement Shared Error And Request Model

## Feature / Component

- Feature: API Contract
- Component: HTTP error handling
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-005-error-request-model`
- Dependencies: Ticket004DefineOpenApiMvpContract

## Task

Implement shared request parsing, validation, response writing, and error handling helpers.

## Implementation Notes

- Use a consistent JSON error envelope.
- Include `request_id` in error responses.
- Validate JSON content type for write endpoints.
- Centralize `writeError` and `writeJSON` helpers.

## Acceptance Criteria

- Malformed JSON returns `400`.
- Validation failures return `422` with field-level context where practical.
- Authentication failures return `401`.
- Authorization failures return `403`.
- Unexpected errors never expose stack traces or secrets.

## Out Of Scope

Business validation rules and endpoint implementation.
