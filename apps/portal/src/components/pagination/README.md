# Pagination

Reusable pagination navigation for public listings and data tables.

## Usage

```tsx
<Pagination
  ariaLabel="Academies pagination"
  currentPage={currentPage}
  totalPages={totalPages}
  getPageHref={(page) => `/academies?page=${page}`}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|---|---:|---:|---|---|
| `ariaLabel` | `string` | Yes | - | Accessible label for the nav landmark. |
| `currentPage` | `number` | Yes | - | Current page number. |
| `totalPages` | `number` | Yes | - | Total page count. |
| `getPageHref` | `(page: number) => string` | No | - | Builds numeric page links. |
| `previousHref` | `string` | No | - | Explicit previous-page link. |
| `nextHref` | `string` | No | - | Explicit next-page link. |
| `onPrevious` | `() => void` | No | - | Previous action for client-side use. |
| `onNext` | `() => void` | No | - | Next action for client-side use. |
| `showPageNumbers` | `boolean` | No | `true` | Shows numeric page buttons when `getPageHref` is supplied. |
| `showSummary` | `boolean` | No | `false` | Shows `Page X of Y` summary text. |

## Behaviour

- Renders nothing when there is only one page unless `showSummary` is enabled.
- Disables previous and next controls at the boundaries.
- Applies `aria-current="page"` to the active numeric page.
- Supports link-based server pagination and callback-based client pagination.

## Accessibility

Use a page-specific `ariaLabel`, such as `Academies pagination` or `Table pagination`.
