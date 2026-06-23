# Notification Service PRD

## Overview

The Notification Service is a platform-level service responsible for receiving notification requests, storing them in a queue, processing them asynchronously, delivering them through configured providers, and tracking delivery status.

The service is channel-agnostic.

Version 1 supports Email only.

Future versions may support:

* SMS
* WhatsApp
* Push Notifications
* In-App Notifications

The service must not contain business logic such as password resets, booking confirmations, academy claims, or subscription notifications.

Business services generate content and submit notification requests.

---

# Objectives

* Provide a centralized notification delivery service.
* Support asynchronous processing.
* Support high-volume message delivery.
* Support retries and failure handling.
* Provide delivery tracking.
* Support multiple delivery providers.
* Support future notification channels.

---

# Scope

## In Scope

* Queue notification requests
* Process queued notifications
* Email delivery
* Retry handling
* Delivery tracking
* Attachments
* Priority processing
* Provider abstraction
* Audit history

## Out of Scope

* Marketing campaign management
* User segmentation
* Newsletter management
* Notification content generation
* Notification templates
* Business-specific logic

---

# Architecture

```text
User Service
Booking Service
Academy Service
Subscription Service
Analytics Service

          |
          v

Notification Service

          |
          v

Notification Queue

          |
          v

Email Provider
```

---

# Notification Lifecycle

```text
CREATED
    |
    v

QUEUED
    |
    v

PROCESSING
    |
    +----------------+
    |                |
    v                v

SENT          FAILED_RETRYABLE
                     |
                     v

                RETRYING
                     |
                     v

           FAILED_PERMANENT
```

---

# Notification Channels

## Supported

```text
EMAIL
```

## Future

```text
SMS
WHATSAPP
PUSH
IN_APP
```

---

# Notification Priorities

```text
CRITICAL
HIGH
NORMAL
LOW
BULK
```

Examples:

| Type                 | Priority |
| -------------------- | -------- |
| Password Reset       | CRITICAL |
| Booking Confirmation | HIGH     |
| Payment Receipt      | HIGH     |
| Welcome Email        | NORMAL   |
| Marketing Email      | BULK     |

---

# User Stories

## US-001

As a service,

I want to queue a notification,

So that it can be delivered asynchronously.

---

## US-002

As the Notification Service,

I want to process queued notifications,

So that messages are delivered reliably.

---

## US-003

As a platform administrator,

I want to inspect notification history,

So that I can troubleshoot delivery issues.

---

## US-004

As the Notification Service,

I want to retry temporary failures,

So that notifications are not lost.

---

# Functional Requirements

## FR-001 Create Notification

Endpoint:

```http
POST /notifications
```

Request:

```json
{
  "channel": "EMAIL",
  "priority": "HIGH",
  "subject": "Booking Confirmed",
  "htmlContent": "<html>...</html>",
  "textContent": "Booking Confirmed",

  "from": {
    "email": "noreply@rollfinders.com",
    "name": "RollFinders"
  },

  "to": [
    {
      "email": "john@example.com",
      "name": "John"
    }
  ],

  "cc": [],
  "bcc": [],

  "attachments": [],

  "metadata": {
    "sourceService": "booking-service",
    "bookingId": "123"
  }
}
```

Response:

```json
{
  "notificationId": "uuid",
  "status": "QUEUED"
}
```

---

## FR-002 Queue Notification

The service shall persist all notification requests before delivery.

Status:

```text
QUEUED
```

---

## FR-003 Process Queue

The service shall process queued notifications using worker processes.

Worker responsibilities:

* Fetch queued notifications
* Lock notification
* Deliver notification
* Update status
* Record attempt history

---

## FR-004 Retry Failed Notifications

Retry schedule:

```text
Attempt 1 Immediate
Attempt 2 1 Minute
Attempt 3 5 Minutes
Attempt 4 15 Minutes
Attempt 5 1 Hour
```

Maximum Attempts:

```text
5
```

After maximum retries:

```text
FAILED_PERMANENT
```

---

## FR-005 Delivery Tracking

The service shall track:

* Created
* Queued
* Processing
* Sent
* Failed
* Retry Count

---

## FR-006 Attachments

The service shall support file attachments.

Example:

```json
{
  "attachments": [
    {
      "fileName": "receipt.pdf",
      "contentType": "application/pdf",
      "storageUrl": "s3://bucket/receipt.pdf"
    }
  ]
}
```

---

## FR-007 Metadata Support

The service shall accept arbitrary metadata.

Example:

```json
{
  "metadata": {
    "academyId": "123",
    "userId": "456",
    "bookingId": "789"
  }
}
```

The service must store metadata but never interpret it.

---

## FR-008 Idempotency

The service shall support idempotency.

Request:

```json
{
  "idempotencyKey": "booking-123-confirmation"
}
```

Duplicate requests shall return the original notification.

---

## FR-009 Search Notifications

Endpoint:

```http
GET /notifications
```

Filters:

* Status
* Channel
* Recipient
* Date Range
* Source Service

---

## FR-010 Notification Details

Endpoint:

```http
GET /notifications/{notificationId}
```

---

# Database Design

## notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,

    channel VARCHAR(50) NOT NULL,

    priority VARCHAR(20) NOT NULL,

    status VARCHAR(50) NOT NULL,

    subject TEXT,

    html_content TEXT,

    text_content TEXT,

    metadata JSONB,

    idempotency_key VARCHAR(255),

    provider_name VARCHAR(100),

    provider_message_id VARCHAR(255),

    attempt_count INTEGER DEFAULT 0,

    next_attempt_at TIMESTAMP,

    last_error TEXT,

    sent_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL,

    updated_at TIMESTAMP NOT NULL
);
```

---

## notification_recipients

```sql
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY,

    notification_id UUID NOT NULL,

    recipient_type VARCHAR(10) NOT NULL,

    email VARCHAR(255) NOT NULL,

    name VARCHAR(255)
);
```

Values:

```text
TO
CC
BCC
```

---

## notification_attachments

```sql
CREATE TABLE notification_attachments (
    id UUID PRIMARY KEY,

    notification_id UUID NOT NULL,

    file_name VARCHAR(255),

    content_type VARCHAR(100),

    storage_url TEXT,

    size_bytes BIGINT
);
```

---

## notification_attempts

```sql
CREATE TABLE notification_attempts (
    id UUID PRIMARY KEY,

    notification_id UUID NOT NULL,

    attempt_number INTEGER,

    status VARCHAR(50),

    error_message TEXT,

    provider_response JSONB,

    attempted_at TIMESTAMP NOT NULL
);
```

---

# Provider Abstraction

```typescript
interface NotificationProvider {
    send(
        notification: Notification
    ): Promise<NotificationResult>;
}
```

Implementations:

```text
SMTP
AWS SES
SendGrid
Mailgun
Postmark
```

---

# Permissions

```text
notification.create
notification.view
notification.search
notification.retry
notification.cancel

notification.provider.view
notification.provider.manage

notification.audit.view
```

---

# Events

Published Events:

```text
NOTIFICATION_CREATED
NOTIFICATION_SENT
NOTIFICATION_FAILED
NOTIFICATION_CANCELLED
```

---

# Monitoring

Metrics:

```text
notifications_created_total
notifications_sent_total
notifications_failed_total
notifications_retry_total

notification_queue_depth
notification_processing_count

notification_send_duration_ms
```

---

# Acceptance Criteria

## AC-001

Given a valid notification request

When submitted

Then a notification record is created with status QUEUED.

---

## AC-002

Given a queued notification

When processed successfully

Then status becomes SENT.

---

## AC-003

Given a temporary provider failure

When processing fails

Then status becomes FAILED_RETRYABLE.

---

## AC-004

Given maximum retries exceeded

When processing continues to fail

Then status becomes FAILED_PERMANENT.

---

## AC-005

Given duplicate idempotency keys

When submitted

Then no duplicate notification is created.

---

# Future Enhancements

## Additional Channels

```text
SMS
WHATSAPP
PUSH
IN_APP
```

## Scheduled Notifications

```text
Send At Future Date
Recurring Notifications
```

## Provider Failover

```text
Primary Provider
Secondary Provider
Automatic Failover
```

## Rate Limiting

```text
Per Service
Per Tenant
Per Academy
```

---

# Recommended MVP

Build first:

* Notification API
* Queue storage
* Email channel
* SMTP provider
* Worker processor
* Retry handling
* Attachments
* Search API
* Audit history
* Metrics

Everything else can be added without redesigning the service.
