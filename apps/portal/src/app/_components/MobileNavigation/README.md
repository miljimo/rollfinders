# MobileNavigation

Bottom navigation for the RollFinders mobile web app.

## Usage

```tsx
<MobileNavigation activeTab="home" />
```

## Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `activeTab` | `MobileNavigationTab` | Yes | Current mobile route tab. |

## Behaviour

- Renders Home, Search, Map, E-Bookings, and Profile.
- Highlights the active tab with the mobile teal treatment.
- Links stay inside `/mobile` tab routes.
- Uses fixed-height tab buttons so active states cannot resize the bottom bar.

## Accessibility

- Uses a semantic `nav`.
- Sets `aria-current="page"` on the active tab.
- Icons are decorative and labels remain visible.
