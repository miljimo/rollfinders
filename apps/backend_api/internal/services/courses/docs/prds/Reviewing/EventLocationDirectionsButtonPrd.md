# PRD - Event Location Directions Button

## Purpose

Make event locations immediately actionable by showing a small directions button beside any visible event address or location line.

## Scope

Applies to:

* Public course detail pages.
* Public open mat detail pages.
* Dashboard event detail dialogs.

## Functional Requirements

### LOC-DIR-001 Show Directions Near Location

WHEN an event detail view displays a non-empty event address or location address
THEN the UI SHALL show a small `Directions` button next to that address.

### LOC-DIR-002 Open External Map

WHEN the user clicks the small `Directions` button
THEN the app SHALL open a map directions URL in a new browser tab.

### LOC-DIR-003 Reuse Existing URL Builder

The implementation SHALL reuse the existing `directionsUrl(address)` helper.

### LOC-DIR-004 Keep Existing Actions

The implementation SHALL NOT remove existing bottom-page actions such as `Directions` or `Academy Details`.

### LOC-DIR-005 Empty Location Guard

IF no address is available
THEN the inline directions button SHALL NOT render.

## UX Requirements

* The button SHALL be small and visually secondary.
* The button SHALL sit beside or directly below the displayed address without disrupting the detail grid.
* The link SHALL use `target="_blank"` and `rel="noreferrer"`.

## Acceptance Criteria

* Public course detail pages with an address show an inline small `Directions` button.
* Public open mat detail pages with an address show an inline small `Directions` button.
* Dashboard event detail dialogs with an address show an inline small `Directions` button.
* Typecheck and focused contract tests pass.
* A local Docker production build starts successfully for testing.
