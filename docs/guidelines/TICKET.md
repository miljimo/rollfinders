:::writing{variant="document" id="72914"}
# Agent Ticket Creation Guide

Use this guide to create clear, small, goal-oriented tickets that an AI developer agent or tester agent can execute with minimum token waste.

## Core Rule

Each ticket must describe **one goal only**.

Do not mix product decisions, implementation work, testing, refactoring, and documentation in the same ticket unless they are required to complete the same goal.

---

# Ticket Format

```md
# Name: <ticket-number> - <clear goal>

## Feature / Component

- Feature: <feature name>
- Component: <service, domain, UI, API, DB, test, or documentation area>
- Priority: <P0 | P1 | P2>
- Branch: `<branch-name>`
- Developer owner: <agent or team>
- Test owner: <agent or team>
- Dependencies: <None or ticket numbers>
- Source PRD: `<path-to-prd>`

## Goal

<One sentence describing the outcome this ticket must achieve.>

## Scope

The agent must:
- <specific responsibility 1>
- <specific responsibility 2>
- <specific responsibility 3>

The agent must not:
- <out-of-scope responsibility 1>
- <out-of-scope responsibility 2>

## Implementation Notes

- <important rule, boundary, or technical instruction>
- <important rule, boundary, or technical instruction>
- <important rule, boundary, or technical instruction>

## Acceptance Criteria

- WHEN <condition>, THEN <expected result>.
- WHEN <condition>, THEN <expected result>.
- WHEN <condition>, THEN <expected result>.

## Regression / Compatibility Tests

- Confirm <existing behaviour> is not broken.
- Confirm <related service/component> still works as expected.
- Confirm no ownership boundary is violated.

## Out Of Scope

- <work that must not be done in this ticket>