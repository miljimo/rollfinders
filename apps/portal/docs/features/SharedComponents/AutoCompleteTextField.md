# PRD: AutoCompleteTextField

## Implementation Metadata

- Suggested component name: `AutoCompleteTextField`
- Suggested branch name: `feature/ui-autocomplete-text-field`
- Primary current use case: Academy selection by name, city, or postcode
- Component scope: Generic autocomplete text field with academy selection as the first production use case
- Implemented component: `src/components/AutoCompleteTextField/`
- Current reuse: `src/app/admin/open-mats/OpenMatForm.tsx`, `src/app/admin/users/UserForm.tsx`

## Implemented Component

`AutoCompleteTextField` is the implemented reusable component for autocomplete-style selection controls.

It currently powers the Open Mat academy picker and the New/Edit User academy assignment field. Parent forms pass academy records as generic options, and the component submits the selected option id through a hidden input named `academyId`, preserving the existing server actions.

Component files:

- `src/components/AutoCompleteTextField/AutoCompleteTextField.tsx`
- `src/components/AutoCompleteTextField/AutoCompleteTextFieldOptionRow.tsx`
- `src/components/AutoCompleteTextField/types.ts`
- `src/components/AutoCompleteTextField/index.tsx`

## Objective

Create a reusable autocomplete text field that lets users quickly find, compare, and select an option from a clear, accessible, keyboard-navigable dropdown.

The component SHALL support academy selection as the first use case while remaining generic enough for future option-selection workflows.

## Problem

Academy search results can contain similar names and nearby postcodes. A cramped dropdown or unclear selection model makes it difficult to scan, compare, and confidently select the correct academy.

The component needs a stronger UX contract for result content, local and async search, strict versus free-text selection, mobile dropdown behavior, validation, keyboard support, and screen-reader semantics.

## Users

- Public users searching for an academy.
- Admin users assigning or editing academy-related records.
- Academy users selecting their academy during onboarding or profile setup.
- Future users selecting non-academy records from a reusable autocomplete field.

## Modes

### Local Options Mode

- The component SHALL accept a local `options` array.
- Local mode SHALL filter options client-side.
- Local mode MAY open the dropdown on focus because the complete option set is already available.
- Local mode SHALL support a configurable `maxResults` cap.

### Async Search Mode

- The component SHALL support an async search mode or parent-controlled async result state.
- Async mode SHALL wait until a minimum query length is reached before searching.
- Async mode SHALL support debounced search.
- Async mode SHALL protect against stale results when a slower previous request returns after a newer query.
- Async mode SHALL expose loading, error, retry, and empty states.
- Async mode SHALL avoid sending unnecessary requests while the query is empty or below the configured minimum length.

### Strict Selection Mode

- Strict selection mode SHALL submit only a selected option id through the configured hidden field name.
- If the user edits typed text after selecting an option, the selected id SHALL be cleared.
- If the field is required and no option is selected, the parent form SHALL show validation.
- Strict mode is recommended for academy assignment fields.

### Free-Text Mode

- Free-text mode SHALL allow typed text to be submitted when no option is selected.
- Free-text mode SHALL provide a clear field name or value contract for the raw typed value.
- Free-text mode SHALL still support selecting an option when a matching option exists.
- Free-text mode is intended for open-ended search fields, not admin academy assignment.

## Requirements

### Content

- The field SHALL display a visible label.
- The input placeholder SHALL be configurable.
- Academy usage SHOULD use placeholder text such as `Search academy by name, city, or postcode`.
- Each result row SHALL show primary option text.
- Academy result rows SHALL show academy name as primary text.
- Academy result rows in admin contexts SHALL show city and postcode where available.
- Academy result rows in public search contexts MAY additionally show address or distance when available.
- Searchable metadata SHOULD be visible when it is important for user confidence; important metadata SHALL NOT be hidden-only.
- The dropdown MAY include capped-results guidance such as `Keep typing to narrow results`.

### Behavior

- Search results SHALL appear in a dropdown directly below the input.
- Selecting a result SHALL populate the input with the selected option label.
- Selecting a result SHALL expose the selected option id to the parent form in strict mode.
- The dropdown SHALL close after a successful selection.
- The dropdown SHALL close when the user presses `Escape`.
- The dropdown SHALL support replacing a selected value by typing a new query.
- Optional fields SHOULD provide a clear affordance when clearing is allowed.
- Required strict-selection fields SHOULD NOT show a clear affordance unless the resulting invalid state is clearly communicated.
- Result ranking SHOULD prioritize exact label matches, starts-with label matches, strong label matches, postcode matches, city matches, contains matches, and proximity when location context exists.
- Async APIs MAY own final ranking, but the component PRD SHALL document how ranked results are presented.

### Interaction States

- The input SHALL have a visible focus state.
- Result rows SHALL have distinct hover and keyboard-highlighted states.
- Selected option state and keyboard-highlighted state SHALL be visually distinguishable.
- Loading state SHALL avoid layout shift.
- Empty state SHALL explain that no matching results were found.
- Async empty state SHOULD reference the current search where useful.
- Error state SHALL communicate that results could not be loaded.
- Async error state SHALL provide a retry affordance when practical.
- Disabled and read-only states SHALL be visually and semantically distinct.

### Keyboard Support

- `ArrowDown` SHALL move highlight to the next result.
- `ArrowUp` SHALL move highlight to the previous result.
- Keyboard navigation SHALL clamp at the first and last result.
- `Enter` SHALL select the highlighted result when the dropdown is open.
- `Escape` SHALL close the dropdown.
- `Tab` SHALL move focus naturally to the next focusable element.
- Keyboard selection SHALL not require moving DOM focus away from the input.

### Mobile Behavior

- The dropdown SHALL remain inline and full-width within its form context.
- Result rows SHALL provide touch targets of at least 44px height.
- Primary and secondary text SHALL remain readable on mobile.
- Critical labels SHALL NOT be clipped or hidden behind metadata.
- The dropdown SHALL avoid tiny nested scroll regions in long forms.
- The component SHALL remain usable at common mobile and desktop viewport widths.

### Visual Design

- The component SHALL align with `./FormFieldSystem.md`.
- The component SHALL use existing RollFinders form field styling where possible.
- The input and dropdown SHALL have clear separation through border, spacing, and/or shadow.
- Result rows SHALL use comfortable compact density suitable for admin forms and touch interaction.
- Primary result text SHALL be visually stronger than supporting metadata.
- Supporting metadata SHALL remain readable but secondary.
- The dropdown SHALL avoid cramped rows, clipped text, and heavy scrollbars.

## Accessibility Requirements

- The label SHALL be programmatically associated with the input.
- The input SHALL follow the ARIA combobox with listbox pattern.
- Input focus SHALL remain on the input during typing, navigation, and selection.
- The result list SHALL use listbox semantics where appropriate.
- Result options SHALL expose stable ids.
- The highlighted option SHALL be communicated with `aria-activedescendant`.
- Each option SHALL expose a stable accessible name.
- Validation errors SHALL be connected to the input with `aria-describedby`.
- Loading, empty, and error states SHOULD be announced through a polite live region without excessive repetition.
- Color contrast SHALL meet WCAG AA for text, state borders, and focus indicators.
- Pointer-only interactions SHALL have keyboard equivalents.

## Technical Requirements

- Implemented location: `src/components/AutoCompleteTextField/`.
- The component SHALL be implemented with TypeScript props.
- The component SHALL not hard-code academy-only data types.
- Academy-specific row labels and metadata SHALL be provided through props.
- The component SHALL support local options.
- The component SHALL support async result state or an async search callback.
- The component SHALL support strict selection and free-text modes.
- The component SHALL submit the selected option id through a hidden input configured by `name` in strict selection mode.
- The component SHALL provide a clear contract for submitting raw typed text in free-text mode.
- The component SHOULD support custom result rendering while preserving accessibility behavior.
- Styling SHALL use the project-standard styling approach.
- Client-only behavior SHALL be isolated to the autocomplete component or a small client wrapper.

## Suggested Props

```ts
type AutoCompleteTextFieldOption = {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  distanceLabel?: string;
  accessibleLabel?: string;
};

type AutoCompleteTextFieldMode = "local" | "async";

type AutoCompleteTextFieldSelectionMode = "strict" | "freeText";

type AutoCompleteTextFieldProps = {
  label: string;
  name: string;
  options?: AutoCompleteTextFieldOption[];
  mode?: AutoCompleteTextFieldMode;
  selectionMode?: AutoCompleteTextFieldSelectionMode;
  freeTextName?: string;
  selectedId?: string;
  placeholder?: string;
  emptyMessage?: string;
  errors?: string[];
  required?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  minQueryLength?: number;
  debounceMs?: number;
  maxResults?: number;
  size?: "md" | "lg";
};
```

## Acceptance Criteria

- Users can type an academy name, city, or postcode and see matching results in academy usage.
- Users can select a result with a mouse or touch.
- Users can select a result using only the keyboard.
- Similar academy names remain distinguishable through visible location and postcode metadata.
- Local mode filters available options without network access.
- Async mode supports minimum query length, debounce, loading, error, retry, and stale-result protection.
- Strict mode clears the selected id when typed text changes after selection.
- Strict required fields validate when the user submits without selecting an option.
- Free-text mode can submit typed text when no option is selected.
- Optional fields can expose a clear control when clearing is allowed.
- Empty, loading, and error states render without layout breakage.
- The component works at common mobile and desktop viewport widths.
- The component follows ARIA combobox/listbox semantics.

## Test Requirements

- Tests SHALL cover rendering with label, placeholder, selected value, and hidden selected id.
- Tests SHALL cover local filtering by label and visible metadata.
- Tests SHALL cover async loading, empty, error, retry, and stale-result behavior.
- Tests SHALL cover mouse/touch selection.
- Tests SHALL cover keyboard navigation, clamped boundaries, `Enter`, `Escape`, and `Tab`.
- Tests SHALL cover strict selection clearing when text changes.
- Tests SHALL cover free-text submission behavior.
- Tests SHALL cover optional clear behavior.
- Tests SHALL cover validation error rendering, `aria-invalid`, and `aria-describedby`.
- Tests SHOULD include one mobile viewport interaction check for row readability, dropdown width, and touch target sizing.

## Out of Scope

- Building the academy search API.
- Defining the full academy ranking algorithm.
- Replacing every existing search field in the application.
- Map-based academy discovery.
- Fullscreen mobile search sheets.
