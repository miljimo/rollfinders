# UserAccountMenu

## Purpose

`UserAccountMenu` displays the current user account summary and opens a compact account action menu.

## Usage

```tsx
<UserAccountMenu
  accountName="Ada Lovelace"
  accountEmail="ada@example.com"
  accountRole="Admin"
  items={[
    { href: "/dashboard/profile", label: "Profile" },
    { href: "/dashboard/settings", label: "Account settings" },
  ]}
  onSignOut={() => signOut()}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `accountName` | `string` | Yes | - | User display name shown on the trigger and menu. |
| `accountEmail` | `string \| null` | No | - | Optional email shown in the opened menu. |
| `accountRole` | `string \| null` | No | - | Optional role label shown with the account details. |
| `avatarLabel` | `string` | No | Account initials | Optional avatar text override. |
| `className` | `string` | No | - | Optional wrapper classes. |
| `defaultOpen` | `boolean` | No | `false` | Opens the menu by default for previews and tests. |
| `items` | `UserAccountMenuItem[]` | No | `[]` | Menu actions or links. |
| `onSignOut` | `() => void` | No | - | Optional sign-out callback. |
| `showRolePill` | `boolean` | No | `false` | Renders the role with pill styling. |
| `signOutLabel` | `string` | No | `Logout` | Label for the sign-out action. |
| `variant` | `"compact" \| "account-dropdown"` | No | `"compact"` | Visual treatment for the trigger and menu. |

## Accepted Behaviours

- WHEN rendered, THEN the component shows the account name and initials.
- WHEN the trigger is selected, THEN the account menu opens.
- WHEN menu items include `href`, THEN they render as links.
- WHEN menu items omit `href`, THEN they render as callback buttons.
- WHEN menu items include icons, THEN those icons render beside the labels.
- WHEN `onSignOut` is supplied, THEN a logout action is shown.
- WHEN `variant` is `account-dropdown`, THEN the menu renders with the larger avatar, notch, icon rows, and role pill support.
- WHEN Escape is pressed or the user clicks outside, THEN the menu closes.

## Accessibility Notes

- The trigger uses `aria-haspopup`, `aria-expanded`, and `aria-controls`.
- The menu uses `role="menu"` and each action uses `role="menuitem"`.
- Focus styles are visible for keyboard users.
- Account identity is provided as text and does not rely on colour alone.

## Usage Notes

- This component does not call authentication or backend APIs directly.
- Pass data through props and connect sign-out behaviour with `onSignOut`.
- Keep page-specific routing decisions outside the component.
