# Name: 001 - Create DataTableWithSearch Component

## Feature / Component

- Feature: UI Component Library
- Component: `DataTableWithSearch`
- Priority: P1
- Branch: `feature/ui-data-table-with-search`
- Developer owner: Frontend Engineer
- Test owner: QA Engineer
- Dependencies: Existing `Table`, `Button`, and dashboard search patterns
- Source PRD: `docs/guidelines/COMPONENT.md`

## Goal

Create a reusable `DataTableWithSearch` component that standardizes the dashboard pattern of a search bar, optional filters/actions, and a paginated data table.

The component should compose existing table behavior instead of replacing `Table`.

## Scope

The agent must:

- Create a reusable component for table plus search composition.
- Reuse the existing `Table` component for table rendering.
- Accept table data, columns, actions, pagination, empty state, and loading state through props.
- Accept search form configuration through props.
- Support optional filter and action slots.
- Preserve existing dashboard table visual style.
- Add behavior tests.
- Add a README with usage examples and prop documentation.

The agent must not:

- Fetch data.
- Call backend APIs.
- Read database or service clients.
- Own URL parsing.
- Own business-specific filtering logic.
- Import page-level modules.
- Replace all existing dashboard tables in the same ticket.

## Component Location

Preferred location, following the component guideline:

```txt
apps/portal/src/components/data-table-with-search/
  DataTableWithSearch.tsx
  index.tsx
  README.md
  DataTableWithSearch.test.tsx
```

If the team decides to match current repo convention instead, use:

```txt
apps/portal/src/components/DataTableWithSearch/
  DataTableWithSearch.tsx
  index.tsx
  README.md
  DataTableWithSearch.test.tsx
```

Decision required before implementation: lowercase guideline path vs existing PascalCase folder convention.

## Component Specification

### Purpose

`DataTableWithSearch` provides a consistent shell for dashboard tables that need:

- a title or heading area,
- a search input,
- optional filter controls,
- optional primary or secondary actions,
- an existing `Table` instance,
- pagination,
- loading and empty states.

It should reduce repeated table/search layout code in subscription, wallet, admin, booking, and other dashboard pages.

### Proposed Props

```tsx
import type {
  TableAction,
  TableColumn,
  TablePaginationProps,
  TableRecord,
  TableRowId,
} from "@/components/Table";
import type { ReactNode } from "react";

export type DataTableSearchConfig = {
  action: string;
  name?: string;
  value?: string;
  placeholder: string;
  submitLabel?: string;
  hiddenFields?: Record<string, string | number | boolean | null | undefined>;
};

export type DataTableWithSearchProps<T extends TableRecord> = {
  title?: ReactNode;
  description?: ReactNode;
  columns: TableColumn<T>[];
  data: T[];
  actions?: TableAction<T>[];
  emptyMessage?: ReactNode;
  filters?: ReactNode;
  getRowHref?: (row: T, rowIndex: number) => string | undefined;
  getRowId?: (row: T, rowIndex: number) => TableRowId;
  headerActions?: ReactNode;
  loading?: boolean;
  loadingMessage?: ReactNode;
  minWidthClassName?: string;
  pagination?: TablePaginationProps;
  search?: DataTableSearchConfig;
};
```

### Props Table

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `title` | `ReactNode` | No | `undefined` | Section title shown above the controls/table. |
| `description` | `ReactNode` | No | `undefined` | Supporting text below the title. |
| `columns` | `TableColumn<T>[]` | Yes | N/A | Passed directly to `Table`. |
| `data` | `T[]` | Yes | N/A | Passed directly to `Table`. |
| `actions` | `TableAction<T>[]` | No | `[]` | Row actions passed to `Table`. |
| `emptyMessage` | `ReactNode` | No | Existing table default | Empty state copy. |
| `filters` | `ReactNode` | No | `undefined` | Optional filter controls rendered beside or below search. |
| `getRowHref` | function | No | `undefined` | Passed directly to `Table`. |
| `getRowId` | function | No | `undefined` | Passed directly to `Table`. |
| `headerActions` | `ReactNode` | No | `undefined` | Page-owned actions such as “New Plan”. |
| `loading` | `boolean` | No | `false` | Passed directly to `Table`. |
| `loadingMessage` | `ReactNode` | No | `undefined` | Loading state copy. |
| `minWidthClassName` | `string` | No | Table default | Passed directly to `Table`. |
| `pagination` | `TablePaginationProps` | No | `undefined` | Passed directly to `Table`. |
| `search` | `DataTableSearchConfig` | No | `undefined` | Search form config. If omitted, no search form renders. |

## Accepted Behaviours

- WHEN `search` is provided, THEN the component renders a GET-compatible form using `search.action`.
- WHEN `search.name` is omitted, THEN the input name defaults to `q`.
- WHEN `search.value` is provided, THEN the input uses it as `defaultValue`.
- WHEN `search.hiddenFields` is provided, THEN truthy values render as hidden inputs and `null`/`undefined` values are skipped.
- WHEN `filters` is provided, THEN filters render in the controls area without owning filter behavior.
- WHEN `headerActions` is provided, THEN actions render in the header/control area.
- WHEN `data` is empty, THEN the existing `Table` empty state is shown.
- WHEN `loading` is true, THEN the existing `Table` loading state is shown.
- WHEN `pagination` is provided, THEN pagination is passed through to `Table`.
- WHEN rendered on mobile, THEN the existing `Table` mobile card behavior remains intact.

## Rejected Behaviours

- Must not call `fetch`, Prisma, server actions, or service clients.
- Must not parse `searchParams`.
- Must not mutate browser history directly.
- Must not hard-code subscription, wallet, payment, booking, or user-specific labels.
- Must not perform client-side filtering unless explicitly added in a later ticket.
- Must not replace `Table` internals.
- Must not require dashboard page modules.

## Accessibility

- Use a semantic `<form>` for search.
- Provide an accessible label for the search input.
- Search submit button must have visible text or an accessible label.
- Preserve `Table` semantics for table rendering.
- Do not rely on color alone for state.
- Ensure search, filters, and actions remain keyboard reachable.

## Styling Notes

- Match existing dashboard table styling:
  - rounded `8px` or less,
  - white surfaces,
  - restrained borders,
  - dense operational layout,
  - no nested decorative cards.
- Controls should wrap cleanly on mobile.
- The search input should not resize the table when typing.

## Example Usage

```tsx
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
  headerActions={
    <Button href="/dashboard/subscriptions?subscriptionsView=subscribers&dialog=new-subscriber" variant="primary">
      New Subscriber
    </Button>
  }
  columns={subscriberColumns}
  data={subscriberRows}
  getRowId={(row) => row.id}
  pagination={{
    page,
    totalPages,
    previousHref,
    nextHref,
  }}
  emptyMessage="No subscribers found."
/>
```

## First Integration Target

Use this component first in the Subscriptions dashboard where table/search repetition is concentrated:

- Plans table.
- Products table.
- Features table.
- Subscribers table.

Do not migrate all tables in the first implementation unless the first integration is already tested and low risk.

## Acceptance Criteria

- WHEN complete, THEN the component folder exists.
- WHEN complete, THEN `DataTableWithSearch.tsx` exists.
- WHEN complete, THEN `index.tsx` exports the component and public types.
- WHEN complete, THEN `README.md` documents purpose, props, examples, accepted behaviours, accessibility notes, and usage notes.
- WHEN rendered with `search`, THEN a search form appears with the configured input name, placeholder, value, hidden fields, and submit label.
- WHEN rendered without `search`, THEN no search form appears.
- WHEN rendered with `filters`, THEN the filters slot appears in the control area.
- WHEN rendered with `headerActions`, THEN actions appear in the control area.
- WHEN rendered with table props, THEN `Table` receives the columns, data, row actions, row IDs, loading state, empty state, and pagination.
- WHEN tests run, THEN accepted behaviours are covered.

## Regression / Compatibility Tests

- Existing `Table` tests still pass.
- Existing dashboard pages still compile.
- No shared component performs API calls.
- No page-level dependency is introduced into the component.
- Subscriptions dashboard still supports search and pagination after first integration.
- Mobile table rendering remains controlled by `Table`.

## Out Of Scope

- API integration.
- Backend changes.
- Global state.
- URL state management beyond rendering a standard form.
- Client-side filtering or sorting.
- Bulk actions.
- Column visibility preferences.
- Export behavior.
- Replacing every dashboard table.
