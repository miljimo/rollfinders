# PRD: Email Delivery Job API

Version: 1.0

Route: `GET|POST /api/jobs/email-delivery`

Source: `src/app/api/jobs/email-delivery/route.ts`

---

# Objective

Allow authorized platform admins to inspect and process queued outbound emails.

---

# IF/WHEN/THEN Requirements

## EMAIL-JOB-001: Platform Admin Authorization

IF a user calls the email delivery job API

WHEN the user is not authorized as a platform admin

THEN the API SHALL reject the request using the existing platform admin API guard.

## EMAIL-JOB-002: List Email Queue

IF an authorized platform admin calls `GET /api/jobs/email-delivery`

WHEN the request includes an optional `limit` query parameter

THEN the API SHALL return queued email records up to the requested or default limit.

## EMAIL-JOB-003: Default Queue Limit

IF an authorized platform admin calls the queue list without `limit`

WHEN the API reads query parameters

THEN the API SHALL use a default limit of `20`.

## EMAIL-JOB-004: Process Email Queue

IF an authorized platform admin calls `POST /api/jobs/email-delivery`

WHEN queued emails are available

THEN the API SHALL process pending outbound email delivery through the reliable email system.

## EMAIL-JOB-005: Safe Response

IF the API returns queued or processed email data

WHEN the response is generated

THEN the API SHALL avoid exposing credentials, provider secrets, or plaintext passwords.

---

# Acceptance Criteria

* Unauthorized users cannot inspect or process email jobs.
* `GET` supports queue inspection.
* `POST` triggers queue processing.
* Responses are JSON and safe for admin use.
