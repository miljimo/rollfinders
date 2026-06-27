# UserAccountDropDownMenu

## Purpose

`UserAccountDropDownMenu` renders the image-style account dropdown by reusing `UserAccountMenu`.

## Usage

```tsx
<UserAccountDropDownMenu
  accountName="webmaster@rollfinders.com"
  accountEmail="webmaster@rollfinders.com"
  accountRole="Super Admin"
  avatarLabel="WR"
  onSignOut={() => signOut()}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `accountName` | `string` | Yes | - | User display name shown in the menu. |
| `accountEmail` | `string \| null` | No | - | Optional email shown below the display name. |
| `accountRole` | `string \| null` | No | - | Optional role pill label. |
| `avatarLabel` | `string` | No | Account initials | Text shown in the circular avatar. |
| `className` | `string` | No | - | Optional wrapper classes. |
| `defaultOpen` | `boolean` | No | `false` | Opens the menu by default, useful for static previews and tests. |
| `helpHref` | `string` | No | `/contact` | Help & Support link destination. |
| `onSignOut` | `() => void` | No | - | Optional logout callback. |
| `profileHref` | `string` | No | `/dashboard/profile` | Profile link destination. |
| `settingsHref` | `string` | No | `/dashboard/settings` | Settings link destination. |

## Accepted Behaviours

- WHEN rendered, THEN the trigger shows a large circular avatar and chevron.
- WHEN opened, THEN the menu shows account name, email, and role pill.
- WHEN opened, THEN Profile, Settings, Help & Support, and Logout are shown as icon rows.
- WHEN route props are supplied, THEN the matching rows use those hrefs.
- WHEN `onSignOut` is supplied, THEN Logout emits that callback through `UserAccountMenu`.

## Accessibility Notes

- Menu semantics are inherited from `UserAccountMenu`.
- The trigger exposes expanded state through `aria-expanded`.
- Each action is rendered as a link or button with visible text.

## Usage Notes

- This wrapper does not call authentication or backend APIs.
- Use this component where the full account dropdown visual treatment is required.
- Use `UserAccountMenu` directly for custom account menu compositions.
