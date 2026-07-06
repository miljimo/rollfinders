# PRD: Legacy Academy Balance Withdrawal

## Overview

Before Stripe Connect was introduced, customer payments were processed through the Rollfinders Stripe account and academy earnings accumulated within Rollfinders.

After Stripe Connect onboarding, new payments flow directly to academy-owned Stripe accounts.

This feature allows academies to withdraw any remaining legacy balance held by Rollfinders.

---

# Business Goal

Provide a secure and auditable process for academies to request withdrawal of historical funds currently held within the Rollfinders platform account.

This feature applies only to legacy balances.

Future earnings processed through connected Stripe accounts are excluded.

---

# Scope

## Included

* View legacy balance
* Request withdrawal
* Withdrawal approval workflow
* Withdrawal rejection workflow
* Manual payout execution
* Withdrawal history
* Audit trail

## Excluded

* Automatic payouts
* Scheduled payouts
* Stripe Connect earnings
* Future payment flows

---

# Roles

## Academy Admin

Can:

* View available balance
* Create withdrawal requests
* View withdrawal history
* Cancel pending requests

Cannot:

* Approve requests
* Execute payouts
* Modify approved requests

---

## Platform Admin

Can:

* View all withdrawal requests
* Approve requests
* Reject requests
* Execute payouts
* View audit history

---

# Business Rules

## Withdrawal Request

Academy may request withdrawal only when:

* Academy is active
* Academy is verified
* Academy has connected Stripe account
* Stripe onboarding completed
* Available balance is greater than zero

---

## Approval Required

All withdrawals require manual approval.

No withdrawal may be automatically processed.

---

## Payout Execution

Approval does not move funds.

Approval only authorizes the withdrawal.

A separate payout execution step is required.

---

# Withdrawal Lifecycle

```text
pending_review
    ↓
approved
    ↓
processing
    ↓
completed
```

Alternative flow:

```text
pending_review
    ↓
rejected
```

Alternative flow:

```text
pending_review
    ↓
cancelled
```

---

# Balance Calculation

Available Balance is calculated as:

```text
Legacy Balance
- Pending Withdrawals
- Approved Withdrawals
- Processing Withdrawals
- Completed Withdrawals
```

---

# Database

## academy_balances

Stores remaining academy funds held by Rollfinders.

```sql
CREATE TABLE academy_balances (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL UNIQUE,

    legacy_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

## academy_withdrawal_requests

```sql
CREATE TABLE academy_withdrawal_requests (
    id UUID PRIMARY KEY,

    academy_id UUID NOT NULL,

    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,

    status VARCHAR(50) NOT NULL,

    requested_by UUID NOT NULL,
    requested_at TIMESTAMP NOT NULL,

    approved_by UUID NULL,
    approved_at TIMESTAMP NULL,
    approval_notes TEXT NULL,

    rejected_by UUID NULL,
    rejected_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,

    processed_by UUID NULL,
    processed_at TIMESTAMP NULL,

    stripe_account_id VARCHAR(255) NULL,
    stripe_transfer_id VARCHAR(255) NULL,

    completed_at TIMESTAMP NULL,

    notes TEXT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

---

# API Endpoints

## Academy Balance

### Get Balance

```http
GET /academies/{academyId}/balance
```

Response:

```json
{
  "legacyBalance": 500.00,
  "pendingWithdrawals": 100.00,
  "approvedWithdrawals": 50.00,
  "availableBalance": 350.00
}
```

---

## Withdrawal Requests

### Create Request

```http
POST /academies/{academyId}/withdrawals
```

Request:

```json
{
  "amount": 200.00,
  "notes": "Withdraw legacy academy funds"
}
```

Validation:

```text
Amount > 0
Amount <= Available Balance
Academy Verified
Stripe Connected
Stripe Onboarding Complete
```

---

### List Requests

```http
GET /academies/{academyId}/withdrawals
```

---

### Get Request

```http
GET /withdrawals/{withdrawalId}
```

---

### Cancel Request

Allowed only while status is:

```text
pending_review
```

```http
POST /withdrawals/{withdrawalId}/cancel
```

---

# Admin APIs

## Approve Request

```http
POST /admin/withdrawals/{withdrawalId}/approve
```

Request:

```json
{
  "approvalNotes": "Balance verified"
}
```

Result:

```text
Status → approved
```

---

## Reject Request

```http
POST /admin/withdrawals/{withdrawalId}/reject
```

Request:

```json
{
  "reason": "Balance verification failed"
}
```

Result:

```text
Status → rejected
```

---

## Execute Payout

```http
POST /admin/withdrawals/{withdrawalId}/process
```

Result:

```text
Status → processing
```

System records:

```text
Stripe Transfer Id
Processed By
Processed At
```

---

## Complete Payout

```http
POST /admin/withdrawals/{withdrawalId}/complete
```

Result:

```text
Status → completed
```

---

# Stripe Integration

The payout destination must be the academy's connected Stripe account.

Store:

```text
stripe_account_id
stripe_transfer_id
```

Do not store:

```text
Bank account numbers
Sort codes
Account holder details
```

Those remain managed by Stripe.

---

# UI Requirements

## Academy Dashboard

### Balance Summary

Cards:

```text
Legacy Balance
Pending Withdrawals
Approved Withdrawals
Available Balance
```

---

### Withdrawal History

Columns:

```text
Date
Amount
Status
Requested By
Completed Date
```

---

### Actions

```text
Request Withdrawal
View History
Cancel Pending Request
```

---

# Admin Dashboard

Columns:

```text
Academy
Requested Amount
Available Balance
Status
Requested By
Requested Date
```

Actions:

```text
Approve
Reject
Execute Payout
Mark Completed
```

---

# Audit Requirements

Record every state transition.

Examples:

```text
Withdrawal Requested
Withdrawal Approved
Withdrawal Rejected
Withdrawal Processing Started
Withdrawal Completed
Withdrawal Cancelled
```

Audit records must include:

```text
User
Action
Timestamp
Notes
```

---

# Acceptance Criteria

* Academy can view available legacy balance.
* Academy can submit withdrawal request.
* System prevents over-withdrawal.
* Academy cannot bypass approval workflow.
* Admin approval is mandatory.
* Approval does not automatically transfer funds.
* Admin can reject requests.
* Admin can execute payouts.
* Admin can complete payouts.
* All actions are audited.
* Academy can view withdrawal history.
* Available balance updates correctly after payout completion.
* Stripe account must be connected before a withdrawal request can be submitted.
