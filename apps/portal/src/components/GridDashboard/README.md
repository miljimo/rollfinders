# GridDashboard

## Purpose

`GridDashboard` renders the dashboard service launcher grid with a searchable list of service cards. Each card is rendered by `GridItemDashboard`.

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
];

<GridDashboard items={items} />;
```

## Props

| Component | Prop | Type | Required | Description |
|---|---|---|---:|---|
| `GridDashboard` | `items` | `GridDashboardItem[]` | Yes | Cards to display in the dashboard grid. |
| `GridItemDashboard` | `item` | `GridDashboardItem` | Yes | Card data for one dashboard link. |
| `GridItemDashboard` | `className` | `string` | No | Layout class names supplied by the parent grid. |

## Accepted Behaviours

- Renders one link card per item.
- Filters cards by label or description through the search input.
- Shows an empty state when no cards match the search.
- Keeps individual card rendering inside `GridItemDashboard`.

## Accessibility

- The search input has a screen-reader label.
- Each dashboard item is rendered as a semantic link.
- Focus styling is visible on keyboard navigation.

## Usage Notes

- `GridDashboard` owns filtering and grid layout.
- `GridItemDashboard` owns the visual card and link markup.
- Components receive data through props and do not call backend APIs.
