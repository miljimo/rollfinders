# PRD: Upcoming Near You Card

Version: 1.0

Feature area: Open Mats

Source: `src/app/page.tsx`

Status: Ready for development

---

# Schema Impact

No schema changes are required for this component PRD.

IF this component is implemented or updated

WHEN the deployment is prepared

THEN no database migration script SHALL be required for this PRD.

AND the component SHALL use existing Open Mat, Academy, recurrence, occurrence status, and location-aware discovery data.

AND the component SHALL NOT introduce labels that are not backed by existing data.

---

# Objective

Define the home page `Upcoming Near You` card so practitioners can quickly answer: "Where can I train next?"

The card SHALL provide a compact, high-signal list of upcoming or currently in-session Open Mats and route users into Open Mat Radar for the full list.

---

# Design Contract

The card SHALL follow the compact home-page list pattern shown in the current product UI.

IF the home page renders the `Upcoming Near You` card

WHEN the card is visible

THEN it SHALL show:

* Heading: `Upcoming Near You`
* Maximum of 3 occurrence rows
* Compact rows, not full event cards
* Open Mat title as primary row text
* Academy name and gi type as secondary row text
* Compact metadata pills for start time, price, recurrence, and other backed labels
* Date label above start time on the right side where space allows
* Visible row affordance for opening details
* `View all open mats near you` action below the rows

IF the implementation does not have a trusted data field for a label such as `Drop-in`, `All levels`, `Beginner friendly`, `Members only`, or `Advanced`

WHEN the row renders

THEN the system SHALL NOT show that label.

AND the system SHALL NOT derive suitability, access, or drop-in labels from row index.

---

# Data Contract

The card SHALL consume a stable Open Mat occurrence view model.

Each row SHOULD receive:

* `id`
* `occurrenceId`
* `occurrenceDate`
* `occurrenceDateParam`
* `occurrenceStatus`
* `title`
* `startTime`
* `endTime`
* `price`
* `giType`
* `academy.name`
* `academy.discoveryTrustRank` or an equivalent reusable trust-ranking value
* `distanceMiles` when location is known
* `isRecurringOccurrence`
* `recurrenceLabel` when recurring
* backed display labels only when supported by stored or computed data

IF a field is not available in the view model

WHEN the row renders

THEN the component SHALL omit the dependent UI element rather than show placeholder or misleading copy.

---

# IF/WHEN/THEN Requirements

## UYN-001: Render Upcoming Near You Card

IF the home page renders

WHEN Open Mat discovery data is available

THEN the page SHALL show an `Upcoming Near You` card.

AND the card SHALL display up to 3 Open Mat occurrences.

AND each occurrence SHALL link to its Open Mat detail page.

AND the card SHALL use a dedicated card-level selection policy instead of relying on row index for labels or date state.

---

## UYN-002: Empty State

IF no upcoming Open Mat occurrences are available

WHEN the home page renders the `Upcoming Near You` card

THEN the card SHALL show concise empty state copy.

AND the card SHALL keep the home page layout stable.

AND the empty state SHOULD include or sit near a route to Open Mat Radar.

---

## UYN-003: Occurrence Row Content

IF an Open Mat occurrence is shown in the card

WHEN the occurrence row renders

THEN the row SHALL show:

* Open Mat title
* Academy name
* Gi type
* Date label
* Start time
* Price
* Recurrence label where applicable
* Backed suitability or access labels only where available
* Navigation affordance to open the details

---

## UYN-004: Date Label

IF an occurrence date is today

WHEN the row renders

THEN the row SHALL show `Today` unless the occurrence is currently in session.

AND the row SHALL show the occurrence start time separately.

IF an occurrence is currently in session

WHEN the row renders

THEN the row SHALL show `Now` or an equivalent in-session date label.

AND the row SHALL show the occurrence start time separately.

IF an occurrence is not happening today

WHEN the row renders

THEN the row SHALL show the actual date the occurrence is happening.

AND the row SHALL still show the occurrence start time separately.

AND the date/time presentation SHOULD match the compact future-row pattern, for example `Tue 9 Jun` with `19:00`.

AND date labels SHALL be derived from the occurrence date and status, not from the row index.

AND date/time calculations SHALL use the application's configured timezone behavior.

---

## UYN-005: In-Session State

IF an Open Mat occurrence has started and has not ended

WHEN the occurrence row renders

THEN the row SHALL clearly indicate that the session is currently happening.

AND the indication SHALL be visually distinct from normal upcoming sessions.

AND the row SHALL still show the start time.

AND the state SHALL work for one-off Open Mats and derived recurring occurrences.

AND an occurrence SHALL stop being in-session at its end time.

---

## UYN-006: Completed Occurrences

IF an Open Mat occurrence has ended

WHEN the `Upcoming Near You` card data is calculated

THEN the completed occurrence SHALL NOT be shown in the card.

AND completed one-off source records SHALL remain available for admin, history, and audit workflows.

---

## UYN-007: Recurring Occurrences

IF an Open Mat occurrence is derived from a recurring source listing

WHEN the row renders

THEN the row SHALL show a recurrence label such as `Weekly` or `Monthly`.

AND the card SHALL NOT require duplicate future Open Mat records.

AND recurring detail links SHALL include the occurrence date parameter when the detail route requires it.

---

## UYN-008: Sorting And Candidate Selection

IF the card selects occurrences to show

WHEN upcoming or in-session occurrences exist

THEN the primary ordering SHALL be soonest occurrence first because the card represents what is coming up next.

AND academy discovery trust ranking SHALL be used to choose between otherwise comparable candidates.

AND when user location or search coordinates are available, distance SHALL be used as a tiebreaker or secondary ranking factor after time relevance and trust ranking.

AND when location is not available, visible rows SHALL fall back to the platform's default upcoming Open Mat ordering.

AND recurring occurrence expansion SHALL respect the public recurring guardrails defined in the recurring rollings PRD so one recurring source cannot dominate the candidate pool.

---

## UYN-009: Location Fallback

IF the application does not know the user's location or search coordinates

WHEN the card renders

THEN the card MAY still use the heading `Upcoming Near You` for product consistency.

AND the occurrence selection SHALL fall back to the platform's default public Open Mat discovery area and upcoming ordering.

AND the `View all open mats near you` action SHALL route to Open Mat Radar without misleading distance claims.

IF location or search coordinates are known

WHEN the card renders

THEN the card SHOULD use location-aware candidate selection.

AND the `View all open mats near you` action SHOULD preserve `lat` and `lng` query parameters.

---

## UYN-010: View All Link

IF the `Upcoming Near You` card renders

WHEN the user activates `View all open mats near you`

THEN the system SHALL navigate to Open Mat Radar.

AND the link SHOULD preserve known location query parameters when the card is based on a known user/search location.

---

## UYN-011: Responsive And Accessible Rows

IF the card renders on mobile or desktop

WHEN a practitioner views or navigates the rows

THEN each row SHALL remain readable without text overlap.

AND each row SHALL provide a clear clickable target.

AND icon-only navigation affordances SHALL be decorative or have accessible labels through the parent link.

---

# Test Requirements

## UYN-T001: Date Labels Are Data-Driven

IF automated tests render rows for today, a future date, and an in-session occurrence

WHEN the rows are ordered in any position

THEN date labels SHALL be derived from occurrence date and status, not array index.

---

## UYN-T002: Unsupported Labels Are Hidden

IF suitability or drop-in labels are not present in the occurrence view model

WHEN the card renders

THEN labels such as `Drop-in` or `All levels` SHALL NOT be shown.

---

## UYN-T003: Public Visibility Rules

IF completed one-off or recurring occurrences exist

WHEN card data is calculated

THEN completed occurrences SHALL be excluded.

AND in-session occurrences SHALL remain visible until their end time.

---

## UYN-T004: Recurring Links And Guardrails

IF a recurring occurrence is shown

WHEN the row link is rendered

THEN the link SHALL preserve the occurrence date context required by the detail page.

AND recurring occurrence expansion SHALL respect weekly and monthly public occurrence guardrails.

---

## UYN-T005: Location And Ranking

IF location query parameters are available

WHEN the card renders and the `View all` action is generated

THEN location parameters SHALL be preserved where supported.

AND visible rows SHALL follow the card-level ranking policy.

---

## UYN-T006: Timezone Boundaries

IF occurrence start or end times fall near day boundaries or daylight-saving changes

WHEN occurrence status and date labels are calculated

THEN the card SHALL use the application's configured timezone behavior consistently.

---

# Done When

* The home page has a dedicated `Upcoming Near You` card requirement.
* The card shows no more than 3 Open Mat occurrences.
* Rows show title, Academy, gi type, date label, start time, price, and navigation.
* Future rows show the actual occurrence date and start time.
* Row labels are backed by real occurrence data and are not derived from index.
* In-session Open Mats are clearly labelled.
* Completed sessions are not shown.
* Recurring occurrences show recurrence labels without creating duplicate source records.
* Recurring occurrence links preserve occurrence date context where required.
* Selection is soonest-first, with trust ranking and distance used as secondary factors.
* The `View all open mats near you` link opens Open Mat Radar.
* The requirement is ready for development without requiring schema changes.
