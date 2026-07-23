# CopyButton

Copies a supplied string value to the clipboard.

## Usage

```tsx
<CopyButton label="Copy wallet id" value={walletId} />
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `label` | `string` | Yes | - | Accessible label before copy succeeds. |
| `value` | `string` | Yes | - | Text copied to the clipboard. |
| `copiedLabel` | `string` | No | `Copied` | Accessible label after copy succeeds. |
| `size` | `ButtonSize` | No | `icon` | Shared button size. |
| `variant` | `ButtonVariant` | No | `secondary` | Shared button variant. |

## Behaviour

- Copies `value` with the Clipboard API.
- Shows a check icon briefly after a successful copy.
- Uses an accessible label for icon-only usage.

## Accessibility

The button always receives an `aria-label` and uses the shared `Button` focus styles.
