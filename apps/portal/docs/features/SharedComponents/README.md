# Shared Component PRDs

This folder contains taskable functional implementation requirements for shared RollFinder UI components and generic UI patterns.

## Existing General PRD

* `Table.md` covers the reusable table system as a whole.
* `ApplicationUiAndPageRequirements.md` provides a grouped overview.

## Per-Component PRDs

Component-specific PRDs live in:

`Components/`

Each file maps to a reusable component or table subcomponent and uses IF/WHEN/THEN requirements.

## Implementation Guidance

When implementing UI work:

1. Pick the specific component PRD.
2. Verify likely source file paths.
3. Implement one requirement at a time.
4. Preserve existing layout, access control, and responsive behavior unless the PRD says otherwise.
