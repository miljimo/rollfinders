# PRD: Academy Listing Card Component

![Academy listing card preview](../../../../../apps/portal/docs/assets/ui-components/academy-listing-card.svg)

## Implementation Metadata

- Suggested component name: `AcademyListingCard`
- Current related component: `AcademyCard`
- Suggested branch name: `feature/ui-academy-listing-card-component`

## Objective

Create a reusable public academy listing card for search and directory results.

The card should represent one academy in a scannable list and highlight the information a user needs before opening the academy detail page: academy name, affiliation, location, distance, description, training attributes, drop-in price, upcoming open mat preview, and a clear details action.

## Problem

The current public academy card exists as `src/components/AcademyCard.tsx`, but it is grouped under the broader domain-card pattern. The screenshot shows a specific reusable card pattern that should have its own PRD because it is central to academy discovery and has a distinct layout, hierarchy, and data contract.

## Current UI Pattern

The card includes:

- Academy name as the primary heading.
- Optional affiliation badge, for example `Independent`.
- Location row with map pin icon, borough/city, and postcode.
- Optional distance text, for example `5.7 miles away`.
- Short academy description.
- Capability tags: `Gi`, `No-Gi`, `Beginner friendly`, `Competition`.
- Optional drop-in price tag.
- Upcoming open mat chip with date and start time.
- Primary `Details` action.

## Requirements

### Content

- The component SHALL render the academy name as the main card heading.
- The component SHALL link the academy name and Details action to the academy detail route.
- The component SHALL show affiliation when present.
- The component SHALL show location using borough when available, otherwise city.
- The component SHALL show postcode.
- The component SHALL show distance only when a distance value exists.
- The component SHALL clamp or constrain long descriptions to preserve card height.
- The component SHALL render capability tags only when their source value is true.
- The component SHALL render drop-in price only when a price value exists.
- The component SHALL render a limited set of upcoming open mat chips.

### Data

The component should support this data shape:

```ts
type AcademyListingCardItem = Academy & {
  events: Event[];
  distanceMiles?: number | null;
};
```

### Visual Design

- The card SHALL use the shared `Panel` or surface component when available.
- The card SHALL use the shared `Badge` component for affiliation, capability, price, and event chips when available.
- The card SHALL use the shared `Button` component for the Details action when available.
- The card SHALL preserve the current compact white card style with stone border, subtle shadow, and 8px radius.
- The primary action SHOULD remain visually strong and use the neutral dark button style.

### Behavior

- The card SHALL render as an `article`.
- The Details action SHALL navigate to `/academies/[slug]`.
- Event chips SHALL navigate to `/open-mats/[id]`.
- If no events are available, the event chip area SHALL not render.
- The card SHALL be usable in responsive grid/list layouts.

## Accessibility Requirements

- The academy name SHALL be a semantic heading.
- The map pin icon SHALL be decorative when location text is visible.
- Affiliation and capability badges SHALL communicate meaning through text.
- The Details action SHALL have clear link text.
- The card SHALL remain keyboard navigable without nested interactive conflicts.

## Technical Requirements

- Preferred location: `src/components/AcademyListingCard.tsx`.
- Existing `AcademyCard` may either be renamed to `AcademyListingCard` or wrapped/exported during migration.
- Use `formatDate`, `formatDistanceMiles`, and `formatMoney` from `src/lib/utils.ts`.
- Use `MapPin` from `lucide-react`, matching the current implementation.
- Keep the component server-compatible.
- Add focused tests if the project test setup supports React component rendering for shared components.

## Acceptance Criteria

- The card matches the screenshot layout at desktop card width.
- The card remains readable on mobile widths.
- Optional affiliation, distance, drop-in price, and event chips render only when data exists.
- Capability tags render only for enabled academy attributes.
- Links navigate to the correct academy and open mat routes.
- The implementation can replace current `AcademyCard` usage in public academy listing pages.

## Migration Targets

1. `src/components/AcademyCard.tsx`
2. `src/app/academies/page.tsx`
3. `src/app/map/page.tsx`, if it uses the same academy listing pattern

## Open Questions

- Should the implementation rename `AcademyCard` to `AcademyListingCard`, or should `AcademyCard` remain as a compatibility export?
- Should affiliation use a neutral/amber badge consistently, or should affiliation badges become configurable by source/type?
- Should the card show one upcoming open mat or continue showing up to two events?

