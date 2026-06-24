# RollFinders Web

The existing Next.js app still lives at the repository root during the transition.

This directory is a migration target for the secondary web surface once the shared package layer is stable. Until then, the root app should consume `packages/theme`, `packages/ui`, and `packages/types` so mobile and web can converge without a risky one-pass move.

Before moving the root app here, update:

- `Dockerfile`
- `compose.yml`
- `playwright.config.ts`
- CI scripts under `scripts/cicd`
- TypeScript path aliases
- Next standalone output paths
- Terraform/ECS build assumptions
