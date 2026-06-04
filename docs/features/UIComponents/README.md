# UI Component And Page PRDs

This folder contains taskable functional implementation requirements for RollFinder UI.

## Existing General PRD

* `Table.md` covers the reusable table system as a whole.
* `ApplicationUiAndPageRequirements.md` provides a grouped overview.

## Per-Component PRDs

Component-specific PRDs live in:

`docs/features/UIComponents/Components/`

Each file maps to a reusable component or table subcomponent and uses IF/WHEN/THEN requirements.

## Per-Page PRDs

Page-specific PRDs live in:

`docs/features/UIComponents/Pages/`

Each file maps to a route under `src/app` and defines page behavior in small, implementable requirements.

## Implementation Guidance

When implementing UI work:

1. Pick the specific component or page PRD.
2. Verify likely source file paths.
3. Implement one requirement at a time.
4. Preserve existing layout, access control, and responsive behavior unless the PRD says otherwise.
