# UI Component PRD Index

This folder contains one PRD per reusable UI component candidate discovered in the current RollFinders interface.

## Component PRDs

- [Button](./Button.md) - [image](../../assets/ui-components/button.svg)
- [Badge](./Badge.md) - [image](../../assets/ui-components/badge.svg)
- [Table](./Table.md) - [image](../../assets/ui-components/table.svg)
- [Page Header](./PageHeader.md) - [image](../../assets/ui-components/page-header.svg)
- [Metric Card](./MetricCard.md) - [image](../../assets/ui-components/metric-card.svg)
- [Filter Form](./FilterForm.md) - [image](../../assets/ui-components/filter-form.svg)
- [Form Field System](./FormFieldSystem.md) - [image](../../assets/ui-components/form-field-system.svg)
- [Panel Surface](./PanelSurface.md) - [image](../../assets/ui-components/panel-surface.svg)
- [List Panel](./ListPanel.md) - [image](../../assets/ui-components/list-panel.svg)
- [Domain Cards](./DomainCards.md) - [image](../../assets/ui-components/domain-cards.svg)

## Source Areas Reviewed

- `src/app/admin/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/academies/page.tsx`
- `src/app/admin/open-mats/page.tsx`
- `src/app/admin/academies/form.tsx`
- `src/app/admin/open-mats/form.tsx`
- `src/app/dashboard/members/page.tsx`
- `src/components/Table/`
- `src/components/AcademyCard.tsx`
- `src/components/EventCard.tsx`

## Shared Design Principles

- Preserve the current RollFinders visual language: white surfaces, stone borders, teal primary actions, dark neutral actions, compact controls, and dense admin layouts.
- Keep border radius at `rounded-md` or `rounded-lg`.
- Prefer server-compatible components unless browser state is required.
- Continue using Tailwind classes and `clsx` for variants.
- Avoid adding a new dependency unless the component cannot be implemented cleanly with existing tools.
