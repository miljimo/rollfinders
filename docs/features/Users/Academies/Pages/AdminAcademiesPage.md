# PRD: Admin Academies Page

Route: `/admin?panel=academies`

Source: `src/app/admin/page.tsx`

Related PRDs:

* `docs/features/Users/Academies/APIs/AdminAcademiesApi.md`
* `docs/features/Communications/Email/AcademyClaimEmails/Products/AcademyClaimInvitationEmailPrd.md`

## MVP Product Decisions

* Super Admins and Platform Admins can send claim reminders.
* Academy Admins cannot send claim reminders.
* `Unclaimed` means the academy has no academy members and no approved claim.
* Academies with pending claim requests are skipped as `pending_claim` in MVP.
* `Usable email` means the academy email is present, syntactically valid, and not recorded in the invalid email list.
* Claim reminder cooldown is 30 days.
* Bulk sending is limited to current-page selected academies in MVP.
* Maximum bulk batch size is 50 academy IDs.
* Last reminder state is sourced from a dedicated claim reminder ledger.
* Reminder links reuse the public academy claim URL and do not create ownership access.

## Purpose

Let authorized admins search, filter, paginate, manage academy records, and send controlled claim reminder emails to eligible unclaimed academies without disrupting existing academy management or claim approval workflows.

## UI Layout Requirements

IF an authorized admin opens the Academies panel  
WHEN the panel renders  
THEN the page SHALL keep the existing academy search textbox visible in the Academies panel toolbar.

IF claim reminder filters are added  
WHEN the Academies panel toolbar renders  
THEN the search textbox SHALL remain before the claim reminder filters in the visual and keyboard order.

IF the toolbar has enough horizontal space  
WHEN the Academies panel renders on desktop  
THEN the toolbar SHOULD order controls as search textbox, `Unclaimed with valid email` filter preset, claim status filter, email status filter, reminder status filter, and `New Academy` action.

IF the toolbar does not have enough horizontal space  
WHEN the Academies panel renders on smaller screens  
THEN the search textbox SHALL remain visible above or before the wrapped filter controls and SHALL NOT be hidden behind the reminder workflow.

IF the admin enters text in the search textbox  
WHEN the search form is submitted  
THEN the academy list SHALL continue to filter by the existing academy search behavior.

IF the admin clears the search textbox  
WHEN the form is submitted  
THEN the academy list SHALL remove the search query while preserving any selected reminder filters that remain active.

IF search text and reminder filters are both active  
WHEN the admin paginates, refreshes, or clears only one control  
THEN the system SHALL preserve the other active controls in URL state.

## Claim Reminder Table Requirements

IF the Academies panel shows academy rows  
WHEN claim reminder functionality is enabled  
THEN the table SHALL expose claim reminder readiness without removing existing academy columns required for normal academy management.

IF claim reminder columns are added  
WHEN the table renders  
THEN the table SHALL include enough information for an admin to understand claim reminder eligibility, including claim state, email state, and last reminder state.

IF an academy appears eligible for a reminder  
WHEN its row renders  
THEN the row SHOULD expose a `Send claim reminder` action.

IF an academy appears ineligible for a reminder  
WHEN its row renders  
THEN the row SHALL show a human-readable reason such as `Already claimed`, `No email`, `Invalid email`, or `Recently sent`.

IF status badges are used  
WHEN statuses render  
THEN they SHALL use readable text and SHALL NOT rely on color alone.

IF the admin uses keyboard navigation  
WHEN focus reaches row actions or filter controls  
THEN claim reminder controls SHALL be reachable and labelled with the academy context where applicable.

## Claim Reminder Filter Requirements

IF claim reminder functionality is enabled  
WHEN the Academies panel renders  
THEN the page SHALL provide a filter preset labelled `Unclaimed with valid email`.

IF the admin selects `Unclaimed with valid email`  
WHEN the list refreshes  
THEN the page SHALL show academies that appear unclaimed and have a usable email according to list data returned by the backend.

IF an academy has a pending claim request but no approved claim  
WHEN reminder eligibility is evaluated  
THEN the backend SHALL skip it as `pending_claim`.

IF the admin applies claim reminder filters  
WHEN page reloads or pagination changes  
THEN selected filter values SHALL persist in the URL query parameters.

IF no academies match the selected search and reminder filters  
WHEN the table renders  
THEN the empty state SHALL mention both search and filter context rather than implying the system has no academy records.

## Single Reminder Flow

IF an admin chooses `Send claim reminder` for one academy  
WHEN the action is selected  
THEN the UI SHALL show a confirmation dialog before sending.

IF the confirmation dialog opens for one academy  
WHEN the academy has a visible recipient email  
THEN the dialog SHALL identify the academy name and recipient email.

IF the admin cancels the confirmation dialog  
WHEN the dialog closes  
THEN no reminder request SHALL be submitted.

IF the admin confirms the single reminder  
WHEN the backend returns a queued result  
THEN the UI SHALL show success feedback and update the row reminder state to a queued or latest reminder timestamp state.

IF the backend skips the single reminder  
WHEN the response includes a skip reason  
THEN the UI SHALL show the skip reason and SHALL NOT present the reminder as sent.

IF a reminder email is queued  
WHEN the response is shown  
THEN the UI SHALL say `queued`, not `sent`, unless provider delivery is confirmed separately.

IF the backend fails the single reminder request  
WHEN the failure is returned  
THEN the UI SHALL show failure feedback and keep the academy row available for later retry when appropriate.

## Bulk Reminder Flow

IF claim reminder functionality supports bulk send  
WHEN the admin selects academy rows  
THEN a bulk action bar SHALL appear without replacing the search textbox.

IF selected rows include eligible and ineligible academies  
WHEN the admin opens the bulk confirmation dialog  
THEN the dialog SHALL show how many reminders are expected to be sent and how many selected academies are expected to be skipped.

IF the admin cancels the bulk confirmation dialog  
WHEN the dialog closes  
THEN no bulk reminder request SHALL be submitted.

IF the admin confirms bulk sending  
WHEN the backend returns queued, skipped, and failed outcomes  
THEN the UI SHALL display the three outcome counts separately.

IF the backend skips some selected academies  
WHEN the bulk response is processed  
THEN the UI SHALL keep skipped academies in the table and show their current ineligibility reason.

IF a bulk action is in progress  
WHEN the request has not completed  
THEN the UI SHALL prevent duplicate submission from the same confirmation state.

## Requirements

IF an authorized admin opens the page  
WHEN academies are returned  
THEN it SHALL show metrics, filters, table rows, pagination, and permitted actions.

IF the admin is academy scoped  
WHEN page renders  
THEN it SHALL show only the assigned academy records.

IF filters are applied  
WHEN page reloads  
THEN selected filter values SHALL persist.

IF claim reminder functionality is disabled by feature flag  
WHEN the Academies panel renders  
THEN the search textbox, standard filters, academy table, pagination, and permitted management actions SHALL continue to work without claim reminder controls.

IF an admin sends a claim reminder  
WHEN the recipient later opens the claim link  
THEN the existing academy claim submission and admin approval workflow SHALL remain unchanged.

IF a reminder is sent or skipped  
WHEN the UI refreshes  
THEN the latest reminder state SHALL be reflected from backend data rather than assumed from client state alone.

## Backend Contract Summary

IF the frontend sends single or bulk reminder requests  
WHEN the request reaches the backend  
THEN the backend SHALL re-check authorization, unclaimed status, email usability, suppression state, cooldown state, idempotency, and rate limits before queueing any email.

IF the backend determines an academy is ineligible  
WHEN it returns the response  
THEN it SHALL return a structured skip reason that the UI can display.

IF the backend queues a reminder  
WHEN the response is returned  
THEN it SHALL provide enough response data for the UI to update reminder status without claiming provider delivery success.

## Done When

* Uses reusable `Table`.
* Page size supports 20, 50, 100.
* New Academy action appears only where permitted.
* The existing search textbox remains visible and usable after reminder controls are added.
* The Academies panel supports an `Unclaimed with valid email` filter preset.
* Eligible academy rows expose `Send claim reminder`.
* Ineligible academy rows show the reason the reminder action is unavailable.
* Single reminder sends require confirmation.
* Bulk reminder sends require confirmation and show sent, skipped, and failed counts separately.
* Reminder actions do not change academy claim state or grant management access.
* Existing search, pagination, New Academy, and academy management behavior continue to work.
