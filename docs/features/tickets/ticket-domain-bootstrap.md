# ticket-domain-bootstrap.md

# Feature: Route53 Domain Bootstrap & ACM Certificate Provisioning

## Type

Infrastructure Feature

## Priority

High

## Dependency

* Existing Terraform Infrastructure
* Existing AWS Account
* Existing Bitbucket Deployment Pipeline
* Existing Deployment Platform

---

# Objective

Automatically provision and configure the RollFinder public domain using Terraform.

The domain:

```text
rollfinders.com
```

is registered in AWS Route53.

The platform must automatically:

* Discover the Route53 hosted zone
* Create DNS records
* Provision SSL certificates
* Validate certificates
* Connect frontend infrastructure
* Connect API infrastructure
* Output deployment URLs

The solution must be fully automated and require no manual AWS console actions.

---

# Business Goal

After deployment:

Users should be able to access:

```text
https://rollfinders.com
```

and reach the frontend application.

The infrastructure should automatically support:

```text
https://www.rollfinders.com

https://api.rollfinders.com
```

for future API deployment.

---

# Existing Infrastructure Requirements

The AI Agent must first inspect existing Terraform modules.

The agent must reuse existing modules wherever possible.

The agent must not create duplicate implementations.

The following modules should be reused if present:

```text
route53
acm
cloudfront
alb
frontend
dns
```

If a module is missing:

Create the module.

If a module is incomplete:

Extend the module.

---

# Domain Requirements

Primary Domain:

```text
rollfinders.com
```

Secondary Domain:

```text
www.rollfinders.com
```

Future API Domain:

```text
api.rollfinders.com
```

---

# Route53 Requirements

Terraform shall:

Locate existing hosted zone.

Example:

```text
rollfinders.com
```

The hosted zone must not be recreated.

The hosted zone must be discovered using:

```hcl
data "aws_route53_zone"
```

The agent must fail deployment if the hosted zone cannot be found.

---

# Certificate Requirements

Terraform shall provision:

```text
AWS Certificate Manager Certificate
```

Certificate coverage:

```text
rollfinders.com
www.rollfinders.com
api.rollfinders.com
```

Preferred:

```text
*.rollfinders.com
```

plus root domain.

Example:

```text
rollfinders.com
*.rollfinders.com
```

---

# Certificate Validation

Validation must be automatic.

Terraform shall create:

```text
Route53 Validation Records
```

Terraform must wait for validation completion.

No manual DNS validation is permitted.

---

# Frontend DNS Configuration

The frontend application shall be accessible from:

```text
https://rollfinders.com
```

---

# Frontend Hosting Detection

The AI Agent must determine deployment model.

## Option A

Frontend hosted using:

```text
S3
CloudFront
```

Terraform shall create:

```text
A Record Alias
```

pointing to:

```text
CloudFront Distribution
```

---

## Option B

Frontend hosted using:

```text
ECS
ALB
```

Terraform shall create:

```text
A Record Alias
```

pointing to:

```text
Application Load Balancer
```

---

# WWW Redirect

Users accessing:

```text
https://www.rollfinders.com
```

must be redirected to:

```text
https://rollfinders.com
```

Preferred canonical URL:

```text
https://rollfinders.com
```

---

# API Domain Preparation

Terraform must create:

```text
api.rollfinders.com
```

DNS record.

Initially this may point to:

```text
ALB
```

or remain configurable.

The infrastructure must support future API deployment without additional Route53 changes.

---

# Environment Requirements

The same Terraform code must support:

```text
dev
staging
production
```

---

# Environment Domain Strategy

Development:

```text
dev.rollfinders.com
```

Staging:

```text
staging.rollfinders.com
```

Production:

```text
rollfinders.com
```

Future support:

```text
api.dev.rollfinders.com
api.staging.rollfinders.com
api.rollfinders.com
```

---

# Terraform Variables

Required variables:

```text
domain_name
hosted_zone_name
environment
```

Example:

```hcl
domain_name = "rollfinders.com"

hosted_zone_name = "rollfinders.com"

environment = "production"
```

---

# Terraform Outputs

Terraform must expose:

```hcl
frontend_url
frontend_domain
api_url
certificate_arn
hosted_zone_id
cloudfront_distribution_id
```

---

# CI/CD Requirements

Bitbucket deployment pipeline must execute:

```text
terraform init
terraform validate
terraform plan
terraform apply
```

as part of deployment.

The deployment platform must automatically:

* Create certificate
* Validate certificate
* Create DNS records
* Update DNS records
* Deploy frontend
* Verify endpoint

---

# Post Deployment Verification

After deployment:

Pipeline must execute:

```bash
curl https://rollfinders.com
```

Expected:

```text
HTTP 200
```

---

# Deployment Output Requirements

The pipeline must display:

```text
================================================

Deployment Successful

Environment:
production

Frontend URL:
https://rollfinders.com

WWW URL:
https://www.rollfinders.com

API URL:
https://api.rollfinders.com

Certificate ARN:
arn:aws:acm:...

================================================
```

---

# Security Requirements

Certificate must use:

```text
ACM Managed Certificate
```

TLS Version:

```text
TLS 1.2+
```

HTTPS mandatory.

HTTP requests redirected to HTTPS.

---

# Acceptance Criteria

The feature is complete when:

✓ Route53 hosted zone is automatically discovered

✓ ACM certificate is automatically provisioned

✓ ACM certificate is automatically validated

✓ DNS records are automatically created

✓ Frontend is reachable through:

https://rollfinders.com

✓ WWW redirects correctly

✓ HTTPS works correctly

✓ API domain is prepared

✓ Terraform outputs deployment URLs

✓ Bitbucket pipeline displays deployment URLs

✓ No manual AWS console actions required

✓ Solution works for dev, staging and production
