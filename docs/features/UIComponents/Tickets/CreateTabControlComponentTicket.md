# Name: UI-001 - Create TabControl Component

## Feature / Component

- Feature: UI Component Library
- Component: TabControl
- Priority: P1
- Branch: `feature/ui-tab-control`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: None
- Source PRD: `docs/guidelines/COMPONENT.md`

## Goal

Create a reusable tab control component for switching between related dashboard panels.

## Scope

The agent must:
- Create `apps/portal/src/components/tab-control/`.
- Create `TabControl.tsx`.
- Create `index.tsx`.
- Create `README.md`.
- Add behaviour tests.
- Use the component in Subscription Billing Details for Transaction, Plans, and Invoice.

The agent must not:
- Call backend APIs from the component.
- Add page-specific logic to the component.
- Change unrelated dashboard sections.

## Implementation Notes

- The component must receive tab data through props.
- The component must support server-rendered link tabs.
- The component must expose accessible `tablist` and `tab` semantics.
- The component folder must be lowercase.

## Acceptance Criteria

- WHEN rendered with tabs, THEN each tab is visible.
- WHEN a tab matches the active value, THEN it has `aria-selected="true"`.
- WHEN a tab has an href, THEN it renders as a navigable link.
- WHEN a tab is disabled, THEN it is marked disabled and not navigable.
- WHEN used in Billing Details, THEN Transaction, Plans, and Invoice are shown as tabs.

## Regression / Compatibility Tests

- Confirm portal typecheck passes.
- Confirm component tests pass.
- Confirm Billing Details still renders statement details.

## Out Of Scope

- Client-side tab state.
- Backend changes.
- New invoice generation backend.
