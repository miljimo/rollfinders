# GridDashboard

## Purpose

`GridDashboard` renders a searchable, paginated card grid. By default it renders dashboard service launcher cards with `GridItemDashboard`, and it can also render feature-specific cards through `renderItem`.

## Usage

```tsx
import { GridDashboard, type GridDashboardItem } from "@/components/GridDashboard";

const items: GridDashboardItem[] = [
  {
    description: "Manage academy records.",
    href: "/dashboard/academies",
    icon: "academies",
    label: "Academies",
  },
  {
    description: "Create and manage courses, events, seminars, and open mats.",
    href: "/dashboard/courses",
    icon: "events",
    label: "Courses/Events",
  },
];

<GridDashboard items={items} itemsPerPage={12} />;

<GridDashboard
  items={planItems}
  itemsPerPage={10}
  paginationLabel="plans"
  renderItem={(item, className) => <PlanCard item={item} className={className} />}
  showSearch={false}
/>;
```

## Props

| Component | Prop | Type | Required | Description |
|---|---|---|---:|---|
| `GridDashboard` | `items` | `GridDashboardItem[]` | Yes | Cards to display in the dashboard grid. |
| `GridDashboard` | `itemsPerPage` | `number` | No | Number of cards shown per page. Defaults to `12`, which is three rows on the desktop dashboard layout. |
| `GridDashboard` | `renderItem` | `(item, className) => ReactNode` | No | Custom card renderer. Receives the grid layout class for the item. |
| `GridDashboard` | `getItemClassName` | `(item) => string` | No | Overrides responsive grid span classes per item. |
| `GridDashboard` | `getItemKey` | `(item) => string` | No | Provides a stable key for custom item types. |
| `GridDashboard` | `getSearchText` | `(item) => string` | No | Provides searchable text for custom item types. |
| `GridDashboard` | `showSearch` | `boolean` | No | Shows or hides the search field. Defaults to `true`. |
| `GridDashboard` | `alwaysShowPagination` | `boolean` | No | Keeps pagination visible even when there is only one page. |
| `GridDashboard` | `paginationLabel` | `string` | No | Label used in the pagination summary. Defaults to `services`. |
| `GridItemDashboard` | `item` | `GridDashboardItem` | Yes | Card data for one dashboard link. |
| `GridItemDashboard` | `className` | `string` | No | Layout class names supplied by the parent grid. |

## Accepted Behaviours

- Renders one link card per item.
- Filters cards by label or description through the search input.
- Paginates cards when the filtered result count is greater than `itemsPerPage`.
- Renders full-width cards on mobile, then uses a dense twelve-column grid at larger breakpoints.
- Lets cards occupy more grid columns from their label and description size while keeping card height based on its own content.
- Packs cards into open grid slots without forcing row heights.
- Keeps sparse pages from stretching cards across the full row.
- Keeps card headers on one line without allowing them to overflow, and allows descriptions to wrap inside the card.
- Resets to page one when the search query changes.
- Shows an empty state when no cards match the search.
- Keeps default dashboard card rendering inside `GridItemDashboard`.
- Supports custom card types while reusing the same filtering, pagination, dense grid, and item packing behaviour.

## Accessibility

- The search input has a screen-reader label.
- Pagination controls have accessible labels and disabled states.
- Each dashboard item is rendered as a semantic link.
- Focus styling is visible on keyboard navigation.

## Usage Notes

- `GridDashboard` owns filtering and grid layout.
- `GridItemDashboard` owns the visual card and link markup.
- Components receive data through props and do not call backend APIs.
