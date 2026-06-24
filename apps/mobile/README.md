# RollFinders Mobile

This directory is reserved for the Expo application described in `docs/restructure.md`.

Mobile is the primary RollFinders consumer surface. Shared theme tokens, primitive variants, API client types, and validation should come from `packages/*` rather than being recreated inside this app.

Initial implementation rules:

- Import design tokens from `@rollfinders/theme`.
- Import reusable primitive contracts from `@rollfinders/ui`.
- Import API request mechanics from `@rollfinders/api-client`.
- Import shared forms and profile validation from `@rollfinders/validation`.
- Keep mobile feature screens focused on orchestration and data fetching.
- Do not duplicate service contracts that belong in shared packages.

Recommended first screens:

- Academy discovery
- Course/event search
- Booking detail
- User profile
- QR check-in
