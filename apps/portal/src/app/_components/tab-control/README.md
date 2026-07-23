# TabControl

Reusable tab navigation for switching between related panels.

## Usage

```tsx
import { TabControl } from "@/app/_components/tab-control";

<TabControl
  activeValue="invoice"
  ariaLabel="Billing details"
  items={[
    { value: "transaction", label: "Transaction", href: "?tab=transaction" },
    { value: "plans", label: "Plans", href: "?tab=plans" },
    { value: "invoice", label: "Invoice", href: "?tab=invoice" },
  ]}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `activeValue` | `string` | Yes | None | Active tab value. |
| `ariaLabel` | `string` | Yes | None | Accessible label for the tablist. |
| `className` | `string` | No | `""` | Optional wrapper classes. |
| `items` | `TabControlItem[]` | Yes | None | Tabs to render. |

## Accepted Behaviours

- Renders each item as a tab.
- Marks the active item with `aria-selected="true"`.
- Renders navigable tabs as links when `href` is provided.
- Renders disabled tabs as non-navigable items.

## Accessibility

- Uses `role="tablist"` and `role="tab"`.
- Requires `ariaLabel`.
- Does not rely on colour alone; active state is exposed through `aria-selected`.

## Notes

- This component does not call APIs.
- This component does not manage client-side state.
