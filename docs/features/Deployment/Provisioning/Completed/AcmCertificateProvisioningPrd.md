# ACM Certificate Provisioning PRD

## Purpose

Provision and validate AWS Certificate Manager certificates so RollFinders public domains can serve HTTPS without manual console steps.

## Scope

- ACM certificate request or reuse.
- DNS validation records.
- Certificate coverage for frontend, API, and redirect domains.
- Environment-specific certificate outputs.

## Requirements

### Certificate Request

IF HTTPS is required for a hostname, WHEN certificate provisioning runs, THEN the workflow must request or reuse an ACM certificate for that hostname.

### Subject Alternative Names

IF multiple hostnames share one certificate, WHEN the certificate is configured, THEN the subject alternative names must include the required frontend, API, and redirect hosts.

### DNS Validation

IF ACM requires domain validation, WHEN Terraform applies, THEN it must create the required Route 53 DNS validation records.

### Validation Completion

IF a certificate is requested, WHEN provisioning completes, THEN the workflow must wait for certificate validation before exposing the certificate ARN to dependent infrastructure.

### Regional Placement

IF a certificate is used by CloudFront, WHEN it is provisioned, THEN it must be created in the AWS region required by CloudFront.

## Acceptance Criteria

- Certificates are issued or reused without manual AWS console changes.
- DNS validation records are created through Terraform.
- Dependent infrastructure receives a validated certificate ARN.
- CloudFront and load balancer certificate region requirements are handled explicitly.

