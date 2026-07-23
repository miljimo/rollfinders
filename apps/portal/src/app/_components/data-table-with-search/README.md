# DataTableWithSearch

## Purpose

`DataTableWithSearch` provides a reusable dashboard shell for a heading, search form, optional filters/actions, and the existing `Table` component.

## Usage

```tsx
import { DataTableWithSearch } from "@/app/_components/data-table-with-search";

<DataTableWithSearch
  title="Subscribers"
  description="Search and manage active subscription records."
  search={{
    action: "/dashboard/subscriptions",
    name: "subscribersSearch",
    value: subscribersSearch,
    placeholder: "Search subscribers",
    hiddenFields: {
      subscriptionsView: "subscribers",
    },
  }}
  headerActions={<Button href="/dashboard/subscriptions?subscriptionsView=subscribers&dialog=new-subscriber">New Subscriber</Button>}
  columns={columns}
  data={rows}
  pagination={pagination}
  emptyMessage="No subscribers found."
/>
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `title` | `ReactNode` | No | `undefined` | Section title shown above controls and table. |
| `description` | `ReactNode` | No | `undefined` | Supporting text below the title. |
| `columns` | `TableColumn<T>[]` | Yes | N/A | Passed to `Table`. |
| `data` | `T[]` | Yes | N/A | Passed to `Table`. |
| `actions` | `TableAction<T>[]` | No | `[]` | Passed to `Table`. |
| `emptyMessage` | `ReactNode` | No | Table default | Empty state copy. |
| `filters` | `ReactNode` | No | `undefined` | Optional filter controls beside the search form. |
| `getRowHref` | function | No | `undefined` | Passed to `Table`. |
| `getRowId` | function | No | `undefined` | Passed to `Table`. |
| `headerActions` | `ReactNode` | No | `undefined` | Header actions such as create buttons. |
| `loading` | `boolean` | No | `false` | Passed to `Table`. |
| `loadingMessage` | `ReactNode` | No | `undefined` | Loading state copy. |
| `minWidthClassName` | `string` | No | Table default | Passed to `Table`. |
| `pagination` | `TablePaginationProps` | No | `undefined` | Passed to `Table`. |
| `search` | `DataTableSearchConfig` | No | `undefined` | Search form configuration. |

## Accepted Behaviours

- Renders a semantic search form when `search` is provided.
- Defaults the search input name to `q`.
- Renders truthy `hiddenFields` as hidden inputs.
- Skips hidden fields with falsy values.
- Renders `filters` without owning filter state.
- Renders `headerActions` without owning action behavior.
- Delegates table rendering, loading, empty state, row actions, and pagination to `Table`.

## Accessibility

- The search control is a semantic form.
- The input receives an accessible label from the configured placeholder.
- The submit button has visible text.
- Table semantics remain owned by `Table`.

## Usage Notes

- This component does not fetch data, parse URL state, or call backend APIs.
- Page components own filtering, pagination links, and service-specific row mapping.
- Use it when a dashboard table needs the common search/header/table layout.
