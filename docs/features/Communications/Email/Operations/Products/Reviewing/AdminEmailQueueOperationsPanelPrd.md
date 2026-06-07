# PRD: Admin Email Queue Operations Panel

Status: Reviewing

Owner: Product / Platform Admin

Related API: `GET|POST /api/jobs/email-delivery`

Related UI: `/admin`, `/admin/settings`

---

## Objective

Give platform admins a clear Email Operations panel where they can see the current outbound email queue, run the email delivery job on demand, and understand when the job last ran and who triggered it.

This is required because some emails are queued for reliable delivery and retries. Admins need a self-service way to recover pending email delivery without using terminal access or AWS tooling.

---

## User Story

As an Admin, I want to see how many emails are waiting in the queue and manually run the delivery job, so queued emails can be delivered without asking an engineer.

As an Admin, I want to know when the email job last ran and who triggered it, so I can understand whether delivery was recently attempted and who performed the action.

---

## Current State

The Admin Board currently shows an Emails Overview card with:

* Outbound Emails
* Email Attention
* Invalid Emails
* Link to email settings

The existing API can process due emails:

* `GET /api/jobs/email-delivery?limit=20`
* `POST /api/jobs/email-delivery?limit=20`

There is no Admin Board button for running the job and no visible metadata for last run time or triggering admin.

---

## Proposed UI Redesign

Replace the current static Emails Overview card with an Email Operations panel.

### Panel Header

Title: `Email Operations`

Subtitle: `Monitor queued outbound email and manually process due delivery attempts.`

Header actions:

* `Process queue` primary button
* `View settings` secondary link

### Metrics

Show compact metrics in the panel:

* `Queued now`: count of emails with `PENDING` or `RETRY_PENDING` and `nextAttemptAt <= now`
* `Scheduled retry`: count of emails with `RETRY_PENDING` and `nextAttemptAt > now`
* `Attention`: count of `FAILED`, `RETRY_PENDING`, `INVALID_EMAIL`, and `PERMANENTLY_FAILED`
* `Invalid emails`: count of invalid email addresses

Provider implementation details, such as AWS SES, SHALL NOT be displayed in the admin-facing panel.

### Metric Drilldown Tables

Each metric card SHALL be selectable and SHALL replace the lower panel content with a table for that metric.

`Queued now` table rows SHALL show:

* Recipient email
* Target audience, linked to the admin user or academy when available
* Subject
* Status
* Retry count and max retries
* Next attempt time
* Last attempt time
* Failure reason when present

`Scheduled retry` table rows SHALL show the same queue-item metadata, ordered by next attempt time.

`Attention` table rows SHALL show the same queue-item metadata for failed, retry-pending, invalid, and permanently failed outbound emails.

`Invalid emails` table rows SHALL show:

* Invalid email address
* Target audience, linked to the admin user or academy when available
* Last outbound email subject when available
* Failure reason
* Failure count
* Last failure time

### Job Status

Show a job status row:

* `Last triggered`: timestamp, or `Never run`
* `Triggered by`: admin name/email or `System`
* `Last result`: processed count, sent count, failed count, skipped/not-due count

### Recent Activity

Show the most recent email delivery job attempts:

* Time
* Triggered by
* Trigger source: `Admin Board`, `API`, or `System`
* Processed count
* Result status

### States

The panel SHALL support:

* Empty queue state
* Processing state while the action is running
* Success state after job completion
* Failure state when the API errors
* Permission denied state for non-platform admins

---

## IF/WHEN/THEN Requirements

## EMAIL-OPS-001: Queue Count Visibility

IF a platform admin opens the Admin Board

WHEN the Emails Overview panel renders

THEN the panel SHALL show the number of due queued emails waiting for delivery.

## EMAIL-OPS-002: Retry Queue Visibility

IF queued email exists but is not yet due

WHEN the Emails Overview panel renders

THEN the panel SHALL show the scheduled retry count separately from due queued emails.

## EMAIL-OPS-003: Manual Job Trigger

IF a platform admin clicks `Process queue`

WHEN the request is submitted

THEN the system SHALL call the email delivery job API and process due emails through the existing reliable email service.

## EMAIL-OPS-004: Admin Authorization

IF a non-platform-admin user opens the Admin Board or calls the trigger action

WHEN authorization is evaluated

THEN the system SHALL hide or disable the job trigger and reject unauthorized job execution.

## EMAIL-OPS-005: Last Run Metadata

IF the email delivery job has been triggered at least once

WHEN a platform admin views the Email Operations panel

THEN the panel SHALL show the last triggered timestamp, triggering actor, trigger source, and result summary.

## EMAIL-OPS-006: Actor Tracking

IF a platform admin triggers the job from the Admin Board

WHEN the job starts

THEN the system SHALL record the admin user ID, admin email, and trigger source as `Admin Board`.

## EMAIL-OPS-007: System Trigger Tracking

IF the email delivery job is triggered by a scheduled job or API token

WHEN the job starts

THEN the system SHALL record the trigger source as `System` or `API` and SHALL NOT require a user ID.

## EMAIL-OPS-008: Result Summary

IF an email delivery job finishes

WHEN the job result is stored

THEN the system SHALL record processed count, sent count, failed count, retry-pending count, invalid-email count, and completed timestamp.

## EMAIL-OPS-009: Safe Admin Feedback

IF the job fails

WHEN the Admin Board renders feedback

THEN the message SHALL explain that delivery failed without exposing AWS credentials, SMTP secrets, token values, or full stack traces.

## EMAIL-OPS-010: Post-Run Refresh

IF the admin-triggered job completes

WHEN the UI returns to the Admin Board

THEN queue counts and last-run metadata SHALL refresh without requiring the admin to manually reload the page.

## EMAIL-OPS-011: Audit Log

IF an admin triggers the email job

WHEN the action is accepted

THEN an admin audit log entry SHALL be written with action `EMAIL_DELIVERY_JOB_TRIGGERED`.

## EMAIL-OPS-012: Rate Protection

IF a platform admin repeatedly clicks `Process queue`

WHEN a job has already started recently

THEN the system SHALL prevent duplicate concurrent execution or return a clear `job already running` response.

## EMAIL-OPS-013: Due Queue Drilldown

IF a platform admin clicks `Queued now`

WHEN the Email Operations panel refreshes

THEN the lower table panel SHALL list due queue items with recipient, target audience, subject, status, retry metadata, next attempt, last attempt, and failure reason.

## EMAIL-OPS-014: Scheduled Retry Drilldown

IF a platform admin clicks `Scheduled retry`

WHEN the Email Operations panel refreshes

THEN the lower table panel SHALL list scheduled retry queue items with recipient, target audience, subject, status, retry metadata, next attempt, last attempt, and failure reason.

## EMAIL-OPS-015: Attention Drilldown

IF a platform admin clicks `Needs attention`

WHEN the Email Operations panel refreshes

THEN the lower table panel SHALL list failed, retry-pending, invalid, and permanently failed queue items with recipient, target audience, subject, status, retry metadata, next attempt, last attempt, and failure reason.

## EMAIL-OPS-016: Invalid Email Drilldown

IF a platform admin clicks `Invalid emails`

WHEN the Email Operations panel refreshes

THEN the lower table panel SHALL list invalid email records with the email address, target audience, last outbound email subject when available, failure reason, failure count, and last failure time.

## EMAIL-OPS-017: Hide Provider Internals

IF a platform admin views the Email Operations panel

WHEN the operational summary renders

THEN provider implementation details, including `AWS SES`, SHALL NOT be shown in the admin UI.

---

## Data Requirements

The implementation SHOULD add persistent job history for operational visibility.

Suggested model: `EmailDeliveryJobRun`

Fields:

* `id`
* `triggeredByUserId`
* `triggeredByEmail`
* `triggerSource`
* `status`
* `limit`
* `processedCount`
* `sentCount`
* `failedCount`
* `retryPendingCount`
* `invalidEmailCount`
* `startedAt`
* `completedAt`
* `failureReason`

Queue counts can be read from existing `OutboundEmail` statuses.

Queue drilldown rows can be read from existing `OutboundEmail` records and SHOULD include user or academy context when the recipient email can be linked to a platform user or academy contact.

Invalid email drilldown rows can be read from `InvalidEmailAddress` and enriched with the latest matching `OutboundEmail`, linked user, and matching academy contact when available.

---

## API Requirements

The existing `/api/jobs/email-delivery` API SHOULD be extended or wrapped for Admin Board use.

Recommended behavior:

* `GET /api/jobs/email-delivery/status`
  * Returns queue counts and last-run metadata.
* `POST /api/jobs/email-delivery`
  * Processes due emails.
  * Records job run metadata.
  * Returns processed IDs and result counts.

If a new status route is not created, the existing endpoint SHALL return enough metadata for the panel to render queue counts and last-run state safely.

---

## Acceptance Criteria

* Admin Board shows due queued emails, scheduled retries, attention count, and invalid email count.
* Clicking `Queued now`, `Scheduled retry`, `Needs attention`, or `Invalid emails` changes the lower panel into a table for that selected metric.
* Queue item tables show recipient, target audience, subject, status, retry metadata, timing metadata, and failure reason where applicable.
* Invalid email table shows email address, target audience, last outbound subject, failure reason, failure count, and last failure time.
* The admin-facing panel does not expose the email provider name.
* Admin can click `Process queue` from the Email Operations panel.
* Successful runs show how many emails were processed.
* Last triggered time and triggering actor are visible.
* Job run history is persisted.
* Unauthorized users cannot run the job.
* API responses do not expose secrets.
* Existing email delivery behavior remains compatible with immediate-send workflows.
* Existing `/api/jobs/email-delivery` cron/API-token behavior remains usable.

---

## Open Questions

* Should scheduled EventBridge runs be added in the same implementation ticket or a separate infrastructure ticket?
* Should admins be able to process all queued emails, or only emails due now?
* Should failed emails have a separate `Retry failed now` action?
* Should the panel live only on `/admin/settings`, or should the Admin Board summary also include the trigger button?
