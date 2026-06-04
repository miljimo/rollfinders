# Reliable Email Delivery and Email Failure Management

## Version

1.0

## Author

Engineering Team

---

# Objective

Implement a reliable email delivery capability that ensures outbound emails are not lost when delivery fails.

The system shall:

* Persist email messages before attempting delivery.
* Retry failed email deliveries automatically.
* Track delivery status for each recipient.
* Mark email addresses as invalid after repeated permanent failures.
* Allow Super Administrators to view and delete invalid email records.

This feature ensures resilience, auditability, and operational visibility of all outbound email communications.

---

# Background

The platform sends emails to registered users.

Email delivery can fail due to:

* Invalid email addresses
* Temporary mail server outages
* Network issues
* Email provider throttling
* Recipient mailbox issues

Without persistence and retry mechanisms, important communications may be permanently lost.

The platform requires a durable email delivery workflow that guarantees delivery attempts are tracked and recoverable.

---

# Scope

## In Scope

* Email message persistence
* Email delivery tracking
* Retry processing
* Failed email handling
* Invalid email detection
* Super Admin management capabilities
* Audit logging

## Out of Scope

* Email template management
* Marketing campaign functionality
* Bulk email analytics
* Third-party CRM integration

---

# Functional Requirements

## FR-001: Email Persistence

The system shall persist every outbound email before attempting delivery.

### Stored Information

* Email identifier
* Recipient email address
* Subject
* Message body
* Created timestamp
* Delivery status
* Retry count
* Last attempted timestamp
* Failure reason

### Acceptance Criteria

* Email record is stored before sending.
* Email record can be retrieved after creation.
* No outbound email is sent without a corresponding stored record.

---

## FR-002: Email Delivery Status Tracking

The system shall track the lifecycle of every email.

### Supported Statuses

* Pending
* Sending
* Sent
* Failed
* Retry Pending
* Invalid Email
* Permanently Failed

### Acceptance Criteria

* Status updates occur automatically.
* Status history is retained.
* Current status is visible through administrative interfaces.

---

## FR-003: Email Sending

The system shall attempt delivery of pending emails.

### Acceptance Criteria

* Email service is invoked using stored message data.
* Successful delivery updates status to Sent.
* Failed delivery updates status appropriately.

---

## FR-004: Automatic Retry Processing

The system shall retry failed email deliveries.

### Retry Rules

* Retry only transient failures.
* Retry attempts occur automatically.
* Retry count is incremented for each attempt.
* Retry schedule should support configurable intervals.

### Acceptance Criteria

* Failed emails enter Retry Pending state.
* Retries execute without manual intervention.
* Retry attempts are logged.

---

## FR-005: Permanent Failure Detection

The system shall detect permanent email failures.

### Examples

* Invalid email address
* Non-existent mailbox
* Rejected recipient

### Acceptance Criteria

* Permanent failures do not enter retry workflows.
* Email status is updated appropriately.
* Failure reason is recorded.

---

## FR-006: Invalid Email Management

The system shall identify and record invalid email addresses.

### Acceptance Criteria

* Invalid email addresses are marked as Invalid Email.
* User records are flagged accordingly.
* Future email attempts to invalid addresses are prevented.

---

## FR-007: User Email Validity Flag

The system shall maintain an email validity status on user records.

### Status Values

* Valid
* Invalid
* Pending Verification (optional)

### Acceptance Criteria

* Invalid users are clearly identified.
* Status updates automatically when permanent failures occur.

---

## FR-008: Super Admin Invalid Email Management

The system shall provide Super Administrators with visibility of invalid email records.

### Super Admin Capabilities

* View invalid email addresses
* View failure reasons
* View associated user accounts
* Delete invalid email records
* Remove users with invalid email addresses

### Acceptance Criteria

* Only Super Admin users can perform these actions.
* All actions are audited.

---

## FR-009: Email Audit Trail

The system shall maintain an audit trail for email processing.

### Audit Events

* Email created
* Email sent
* Delivery failed
* Retry attempted
* Email marked invalid
* Invalid email record deleted

### Acceptance Criteria

* Audit events are timestamped.
* Audit history is retained.

---

# Non-Functional Requirements

## Reliability

* No email should be lost due to application failure.
* Email records must survive service restarts.

## Scalability

* Support increasing volumes of outbound emails.
* Support asynchronous processing.

## Security

* Email content stored securely.
* Administrative functions protected by role-based access controls.

## Observability

* Delivery success and failure metrics available.
* Retry metrics available.
* Invalid email metrics available.

---

# Data Model

## Email Message

| Field           | Description                   |
| --------------- | ----------------------------- |
| Id              | Unique identifier             |
| UserId          | Associated user               |
| EmailAddress    | Recipient address             |
| Subject         | Email subject                 |
| MessageBody     | Email content                 |
| Status          | Current delivery status       |
| RetryCount      | Number of retries             |
| FailureReason   | Latest failure reason         |
| CreatedDate     | Creation timestamp            |
| LastAttemptDate | Last delivery attempt         |
| SentDate        | Successful delivery timestamp |

---

## User

Additional fields:

| Field              | Description         |
| ------------------ | ------------------- |
| EmailAddress       | User email          |
| EmailStatus        | Valid or Invalid    |
| EmailInvalidReason | Failure reason      |
| EmailInvalidDate   | Date marked invalid |

---

# Administrative Screens

## Invalid Email Management

Display:

* User Name
* Email Address
* Failure Reason
* Failure Date
* Number of Failed Attempts

Actions:

* View Details
* Delete Invalid Email Record
* Delete User Record

---

# Success Criteria

The feature is considered successful when:

1. All outbound emails are persisted before sending.
2. Failed emails are retried automatically.
3. Permanent failures are detected correctly.
4. Invalid email addresses are identified and flagged.
5. Super Administrators can manage invalid email records.
6. No email is lost due to transient system failures.
7. Delivery status and audit history are available for operational support.

---

# Dependencies

* Existing user management system
* Existing authentication and authorisation framework
* Email delivery provider integration
* Background processing capability
* Persistent database storage

---

# Risks

| Risk                              | Impact | Mitigation                          |
| --------------------------------- | ------ | ----------------------------------- |
| Large retry backlog               | Medium | Queue monitoring and retry limits   |
| Duplicate email delivery          | High   | Idempotent processing               |
| Incorrect invalid email detection | High   | Use provider failure classification |
| Excessive storage growth          | Medium | Retention and archival policies     |

---

# Future Enhancements

* Email bounce processing
* Email delivery dashboards
* User email re-verification workflows
* Manual email resend capability
* Email retention and archival policies
* Dead-letter queue support

---

# RollFinders Implementation

RollFinders persists outbound emails before delivery through the `OutboundEmail` model. Each message stores recipient, subject, text body, optional HTML body, status, retry count, timestamps, provider message ID, and latest failure reason.

## Status and Audit Trail

Status changes are written to `OutboundEmailStatusHistory`, which provides a timestamped processing audit trail for:

* Email queued
* Sending started
* Sent
* Retry pending
* Invalid email
* Permanently failed

## Retry Processing

The retry worker is exposed at:

```text
/api/jobs/email-delivery
```

It processes due `PENDING` and `RETRY_PENDING` messages, sends through AWS SES, and applies retry backoff intervals of 5 minutes, 15 minutes, 1 hour, 4 hours, and 24 hours. Scheduled callers should authenticate with:

```text
Authorization: Bearer <CRON_SECRET>
```

Authenticated platform admins can also call the endpoint manually.

## Invalid Email Management

Permanent delivery failures are written to `InvalidEmailAddress` and linked back to a user when possible. User records are updated with:

* `emailStatus=INVALID`
* `emailInvalidReason`
* `emailInvalidAt`

Future email queue attempts to invalid addresses are persisted as `INVALID_EMAIL` and are not sent.

Super Administrators can view invalid addresses in the Admin Portal and can:

* Delete the invalid email record, which restores the linked user email status to `VALID`
* Delete the associated user, except protected super-admin users

Both administrative actions are recorded in `AdminAuditLog`.

## Current Email Producers

Academy admin invitations and invitation resends now queue reliable outbound emails before delivery. Additional backend email workflows should call `queueEmail` from `src/lib/reliable-email.ts` instead of sending directly.
