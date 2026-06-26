# Component-First UI Ticket Guide

Use this guide when creating UI component tickets.

## Core Rule

One component = one folder = one ticket.

Build reusable components before page UI.

---

# Component Structure

Each component must use this structure:

```txt
components/
  button/
    Button.tsx
    index.tsx
    README.md
    Button.test.tsx
```

Rules:

* Folder name: lowercase.
* Component file: Capital Case.
* One main component per file.
* `index.tsx` exports the public component and types.
* `README.md` explains usage and behaviour.
* Tests must cover the accepted behaviours.

Examples:

```txt
components/button/Button.tsx
components/button-icon/ButtonIcon.tsx
components/payment-card/PaymentCard.tsx
```

---

# Ticket Format

```md
# Name: <number> - Create <ComponentName> Component

## Feature / Component

- Feature: UI Component Library
- Component: <ComponentName>
- Priority: <P0 | P1 | P2>
- Branch: `feature/ui-<component-folder-name>`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: <None or ticket numbers>
- Source PRD: `<path>`

## Goal

Create a reusable <ComponentName> component.

## Scope

The agent must:
- Create `components/<folder-name>/`.
- Create `<ComponentName>.tsx`.
- Create `index.tsx`.
- Create `README.md`.
- Define props.
- Implement accepted behaviours.
- Add behaviour tests.

The agent must not:
- Build page UI.
- Call backend APIs.
- Add routing logic.
- Add unrelated components.
- Change existing component APIs unless required.

## Component Specification

### Purpose

<What the component does.>

### Props

| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|

### Accepted Behaviours

- WHEN <condition>, THEN <expected behaviour>.
- WHEN <condition>, THEN <expected behaviour>.

### Rejected Behaviours

- Must not <invalid behaviour>.
- Must not <invalid behaviour>.

### Accessibility

- Use semantic HTML.
- Support keyboard behaviour where applicable.
- Provide accessible labels where needed.
- Do not rely on colour alone.

## Implementation Notes

- Folder must be lowercase.
- Component file must be Capital Case.
- Export component and public types from `index.tsx`.
- Receive data through props.
- Emit actions through callbacks.
- Do not call APIs directly.
- Do not import page-level modules.

## Acceptance Criteria

- WHEN complete, THEN the component folder exists.
- WHEN complete, THEN `<ComponentName>.tsx` exists.
- WHEN complete, THEN `index.tsx` exists.
- WHEN complete, THEN `README.md` exists.
- WHEN imported from the folder, THEN the component is available.
- WHEN rendered with valid props, THEN it works as specified.
- WHEN tests run, THEN accepted behaviours are covered.

## Regression / Compatibility Tests

- Existing UI still compiles.
- Existing imports are not broken.
- No page-level dependency is added.
- No direct API call is added.
- Current styling system is followed.

## README Requirements

README.md must include:

- Purpose
- Usage example
- Props table
- Accepted behaviours
- Accessibility notes
- Usage notes

## Out Of Scope

- Page implementation.
- API integration.
- Backend logic.
- Routing.
- Global state.
- Unrelated refactoring.
```

---

# Agent Rules

## 1. One component per ticket

Bad:

```txt
Create Button, Input, Modal, and Card.
```

Good:

```txt
001 - Create Button Component
002 - Create Input Component
003 - Create Modal Component
004 - Create Card Component
```

## 2. Use lowercase folders

Good:

```txt
button
button-icon
subscription-plan-card
```

Bad:

```txt
Button
ButtonIcon
SubscriptionPlanCard
```

## 3. Use Capital Case files

Good:

```txt
Button.tsx
ButtonIcon.tsx
SubscriptionPlanCard.tsx
```

Bad:

```txt
button.tsx
buttonIcon.tsx
subscriptionPlanCard.tsx
```

## 4. Export from index.tsx

```tsx
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
```

## 5. README.md is required

Every component needs a README showing usage and expected behaviour.

## 6. Specify behaviour before code

Each ticket must define:

* Purpose
* Props
* Accepted behaviours
* Rejected behaviours
* Accessibility
* Out of scope

## 7. Components must be reusable

Good:

```tsx
<Button onClick={handleSave}>Save</Button>
```

Bad:

```tsx
<Button />
// Button directly calls saveSubscriptionPlan()
```

## 8. No API calls in shared components

Use callbacks instead.

Good:

```tsx
<Button onClick={onSubmit}>Submit</Button>
```

Bad:

```tsx
<Button onClick={() => fetch("/api/subscriptions")} />
```

## 9. Tests must prove behaviour

Bad:

```txt
Component renders.
```

Good:

```txt
WHEN disabled is true, THEN onClick is not called.
WHEN loading is true, THEN duplicate clicks are prevented.
```

---

# Example Ticket

# Name: 001 - Create Button Component

## Feature / Component

* Feature: UI Component Library
* Component: Button
* Priority: P0
* Branch: `feature/ui-button`
* Developer owner: Developer sub-agent
* Test owner: Tester sub-agent
* Dependencies: None
* Source PRD: `docs/ui/components/button.md`

## Goal

Create a reusable Button component.

## Scope

The agent must:

* Create `components/button/Button.tsx`.
* Create `components/button/index.tsx`.
* Create `components/button/README.md`.
* Add behaviour tests.
* Support variants, sizes, disabled state, loading state, click handling, and accessible labels.

The agent must not:

* Build page UI.
* Add API calls.
* Add routing logic.
* Create unrelated components.

## Component Specification

### Purpose

Reusable action control for forms, dialogs, cards, and pages.

### Props

| Prop        | Type                                              | Required | Default     | Description          |
| ----------- | ------------------------------------------------- | -------: | ----------- | -------------------- |
| `children`  | `React.ReactNode`                                 |      Yes | None        | Content.             |
| `variant`   | `"primary" \| "secondary" \| "danger" \| "ghost"` |       No | `"primary"` | Style.               |
| `size`      | `"sm" \| "md" \| "lg"`                            |       No | `"md"`      | Size.                |
| `disabled`  | `boolean`                                         |       No | `false`     | Blocks interaction.  |
| `loading`   | `boolean`                                         |       No | `false`     | Shows loading state. |
| `type`      | `"button" \| "submit" \| "reset"`                 |       No | `"button"`  | Native type.         |
| `ariaLabel` | `string`                                          |       No | None        | Accessible label.    |
| `onClick`   | `() => void`                                      |       No | None        | Click callback.      |

### Accepted Behaviours

* WHEN rendered, THEN children are visible.
* WHEN variant is set, THEN correct style is applied.
* WHEN size is set, THEN correct size is applied.
* WHEN disabled is true, THEN click is blocked.
* WHEN loading is true, THEN loading state is shown and click is blocked.
* WHEN active and clicked, THEN `onClick` is called.
* WHEN type is omitted, THEN `type="button"` is used.

### Rejected Behaviours

* Must not call APIs.
* Must not navigate directly.
* Must not submit forms unless `type="submit"`.
* Must not ignore disabled/loading state.

### Accessibility

* Use native `<button>`.
* Support keyboard interaction.
* Use text or `ariaLabel` for accessible name.
* Use native `disabled`.

## Implementation Notes

* Folder: `components/button`.
* File: `Button.tsx`.
* Export `Button` and `ButtonProps` from `index.tsx`.
* Use props for data.
* Use `onClick` for actions.
* Do not import services, routes, or APIs.

## Acceptance Criteria

* WHEN complete, THEN `Button.tsx`, `index.tsx`, and `README.md` exist.
* WHEN imported from `components/button`, THEN `Button` is available.
* WHEN rendered with text, THEN text is visible.
* WHEN disabled/loading is true, THEN `onClick` is not called.
* WHEN type is omitted, THEN `type="button"` is used.
* WHEN tests run, THEN behaviour tests pass.

## Regression / Compatibility Tests

* Existing UI compiles.
* Existing imports are not broken.
* Button has no page, route, service, or API dependency.

## README Requirements

README.md must include purpose, usage, props, behaviours, accessibility, and notes.

## Out Of Scope

* Page UI.
* API integration.
* Routing.
* Global state.
* Unrelated refactoring.

```
```
