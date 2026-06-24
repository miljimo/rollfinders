# RollFinders Shared Packages

These packages are the mobile-first boundary for RollFinders.

The current Next.js web app remains at the repository root during the transition, but new shared work should land here first so the future Expo app and the existing web app use the same contracts.

## Packages

| Package | Purpose |
| --- | --- |
| `@rollfinders/theme` | Brand tokens for colors, spacing, typography, radius, shadows, and icon names. |
| `@rollfinders/ui` | Cross-platform primitive contracts such as button variants, card variants, text variants, and belt labels. |
| `@rollfinders/api-client` | Platform-neutral API gateway URL helpers, service headers, fetch wrapper, and service errors. |
| `@rollfinders/types` | Shared application-surface and platform types. |
| `@rollfinders/validation` | Shared Zod validation schemas for forms used by mobile and web. |

## Rules

- Mobile and web should import tokens from `@rollfinders/theme`.
- Shared validation belongs in `@rollfinders/validation`, not inside a screen or page.
- Shared API request mechanics belong in `@rollfinders/api-client`.
- Web-only admin tables and reporting panels can stay in `src/components` until a mobile use case exists.
- Do not move the root Next app to `apps/web` until Docker, CI, Playwright, and deployment scripts are updated together.
