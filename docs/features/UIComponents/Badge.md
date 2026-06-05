# PRD: Badge Component

![Badge component preview](../../assets/ui-components/badge.svg)

## Implementation Metadata

- Suggested component name: `Badge`
- Suggested branch name: `feature/ui-badge-component`

## Objective

Create a reusable badge/tag component for statuses, roles, feature markers, categories, and capability labels.

## Problem

The app currently has `TableStatusBadge`, plus several inline badge/tag implementations in cards and detail pages. These patterns share styling but are not reusable outside their local files.

## Current Repeated Examples

- `TableStatusBadge` in admin users, academies, and open mats tables.
- Inline `StatusBadge` in `src/app/admin/academies/[id]/page.tsx`.
- Academy capability tags: Gi, No-Gi, Beginner friendly, Competition.
- Public card tags: affiliation, gi type, drop-in price.
- User and email statuses: Active, Disabled, Valid, Invalid, Pending.

## Requirements

### Variants

- `status`: active, inactive, disabled, pending, verified, rejected, valid, invalid.
- `role`: standard user, academy admin, platform admin, super admin.
- `feature`: featured, not featured, protected.
- `category`: gi, no-gi, beginner friendly, competition, affiliation, drop-in price.

### Behavior

- The component SHALL accept `children` for display text.
- The component SHALL support an optional `tone` prop.
- The component SHALL normalize common enum strings into readable labels.
- The component SHALL support table cells, detail pages, and card tag groups.
- The component SHALL not be coupled to `Table`.

## Accessibility Requirements

- Badge text must communicate the meaning without relying only on color.
- Decorative badges may render as `span`.
- Status badges inside tables must remain readable at compact sizes.

## Technical Requirements

- Location: `src/components/ui/Badge.tsx`.
- Use TypeScript props.
- Use `clsx` for tone and variant class composition.
- Preserve `TableStatusBadge` as a compatibility wrapper or re-export until all callers migrate.

## Acceptance Criteria

- `Badge` can replace `TableStatusBadge` usage without visual regression.
- `Badge` can replace inline admin detail `StatusBadge`.
- `Badge` can replace academy capability tags.
- Tests cover enum normalization, tones, variants, and custom children.

## Open Question

Should `TableStatusBadge` remain as a table-specific wrapper around `Badge`, or should callers migrate directly to `Badge`?
