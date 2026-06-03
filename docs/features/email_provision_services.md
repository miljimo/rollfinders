# Product Requirements Document (PRD)

## Title

AWS Email Service Provisioning for Backend Applications

## Document Version

1.0

## Author

Engineering Team

## Objective

Provision and configure AWS-managed email services to enable backend applications to send transactional and operational emails securely, reliably, and at scale.

The platform solution must provide a reusable, production-ready email capability that can be consumed by backend services without requiring individual teams to manage email infrastructure.

---

# Background

Backend services require the ability to send emails for various use cases, including:

* User account verification
* Password reset notifications
* System alerts
* Operational notifications
* Transactional communications

The platform engineering team is responsible for providing a secure and compliant email delivery platform within AWS.

---

# Scope

## In Scope

* AWS email service provisioning
* Domain verification
* Email sending authentication
* Infrastructure as Code implementation
* IAM permissions
* Monitoring and observability
* Development, staging, and production environments
* Secure integration for backend applications

## Out of Scope

* Email template design
* Marketing email campaigns
* Frontend email management UI
* Business-specific email content

---

# Functional Requirements

## FR-001: Email Service Provisioning

The platform shall provision an AWS-managed email service capable of sending outbound emails.

### Acceptance Criteria

* Service is provisioned in AWS.
* Service supports programmatic email sending.
* Service supports both plain text and HTML emails.
* Service is available in all required environments.

---

## FR-002: Domain Configuration

The platform shall configure email sending domains.

### Acceptance Criteria

* Sending domain is verified.
* DNS records are documented.
* Domain ownership validation is completed.

---

## FR-003: Email Authentication

The platform shall configure industry-standard email authentication.

### Acceptance Criteria

* DKIM is enabled.
* SPF records are configured.
* Email authentication passes validation checks.

---

## FR-004: Backend Integration

The platform shall provide a mechanism for backend services to send emails.

### Acceptance Criteria

* Backend services can authenticate securely.
* Access is granted through IAM roles.
* API credentials are not hardcoded.
* Integration documentation is provided.

---

## FR-005: Environment Separation

The platform shall support separate environments.

### Acceptance Criteria

* Development environment configured.
* Staging environment configured.
* Production environment configured.
* Environment-specific permissions are enforced.

---

## FR-006: Monitoring

The platform shall provide monitoring and operational visibility.

### Acceptance Criteria

* Email sending metrics are available.
* Delivery failures are observable.
* Operational dashboards are available.
* Alerts can be configured for abnormal failure rates.

---

## FR-007: Security

The platform shall implement security best practices.

### Acceptance Criteria

* Least-privilege IAM policies are used.
* Access is role-based.
* Secrets are not stored in source code.
* All resources comply with organisational security standards.

---

# Non-Functional Requirements

## Reliability

* Email service availability should align with AWS managed service availability.
* Email delivery failures must be observable.

## Scalability

* Solution must support increasing email volume without architectural changes.

## Maintainability

* Infrastructure must be managed through Infrastructure as Code.
* Configuration must be version controlled.

## Observability

* Metrics and logs must be accessible to support teams.
* Operational documentation must be available.

---

# Infrastructure Requirements

The platform engineer shall provision:

* Email sending service
* Verified sending domain
* DNS configuration
* IAM roles and policies
* Monitoring configuration
* Logging configuration
* Infrastructure as Code deployment

---

# Deliverables

## Infrastructure

* AWS email service provisioned
* Verified email domain configured
* IAM permissions configured
* Monitoring configured

## Documentation

* Architecture overview
* Integration guide
* Operational runbook
* DNS configuration guide

---

# Success Criteria

The solution will be considered successful when:

1. Backend applications can send emails successfully.
2. Email authentication is correctly configured.
3. Platform monitoring is operational.
4. Infrastructure is fully managed through Infrastructure as Code.
5. Production deployment is approved and operational.

---

# Dependencies

* AWS account access
* DNS management access

---

# RollFinders Implementation

RollFinders provisions outbound email through AWS SES for the `rollfinders.com` hosted zone.

## Backend Configuration

Backend services receive email settings through the existing application secret and ECS task definition:

* `EMAIL_DOMAIN=rollfinders.com`
* `EMAIL_FROM=no-reply@rollfinders.com`
* `EMAIL_REPLY_TO=support@rollfinders.com`
* `EMAIL_REGION=eu-west-2`
* `SMTP_HOST=smtp.rollfinders.com`
* `SMTP_PORT=587`
* `MAILBOX_LINK=https://mail.rollfinders.com`

The ECS task role is granted `ses:SendEmail` and `ses:SendRawEmail` for the verified `rollfinders.com` SES identity, so backend code should prefer the AWS SES API with IAM role credentials. The SMTP host is also published for services that require SMTP-style configuration.

## DNS Records

Terraform manages the following Route53 records for `rollfinders.com`:

* SES domain verification TXT record
* Three DKIM CNAME records
* Custom MAIL FROM MX record for `mail.rollfinders.com`
* SPF TXT record for `mail.rollfinders.com`
* DMARC TXT record for `_dmarc.rollfinders.com`
* SMTP CNAME alias `smtp.rollfinders.com`

## Operational Visibility

Platform admins can view the active email provisioning values in the RollFinders admin portal. Backend/admin integrations can also read the same non-secret configuration from:

```text
/api/admin/email-provisioning
```
* Approved sending domain
* Security review
* Platform engineering deployment pipeline

---

# Risks

| Risk                               | Impact | Mitigation                              |
| ---------------------------------- | ------ | --------------------------------------- |
| Domain verification delays         | Medium | Coordinate with DNS owners early        |
| Misconfigured email authentication | High   | Validate SPF and DKIM before production |
| Excessive permissions              | High   | Apply least-privilege IAM policies      |
| Lack of monitoring                 | Medium | Implement monitoring before go-live     |

---

# Open Questions

1. Which domain will be used for outbound emails?
2. What are the expected email volumes?
3. Are inbound email capabilities required in the future?
4. Are there compliance or retention requirements for email records?
5. Which backend services require access to the email platform?
