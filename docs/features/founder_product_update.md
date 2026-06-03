# RollFinders MVP PRD (Founder Edition)

Version: 1.0

Status: MVP

Budget Target: Less than £35/month AWS spend

Target Launch: London

Primary Goal: Validate demand before building advanced platform features

---

# Executive Summary

RollFinders helps Brazilian Jiu-Jitsu practitioners answer one question:

> Where can I train today?

The MVP is intentionally small.

The objective is not to build a complete academy management platform.

The objective is to validate:

* User demand
* Search demand
* Open mat discovery demand
* Academy interest

The MVP should be deployable and operational for less than £35 per month.

---

# Product Principles

The MVP should:

* Solve one problem well
* Launch quickly
* Minimize AWS costs
* Reuse existing Terraform modules
* Avoid premature scaling
* Avoid complex administration

The MVP should not:

* Build social features
* Build messaging
* Build reviews
* Build billing
* Build academy team management
* Build platform admin management

---

# Success Criteria

Within 90 days:

* 500 monthly visitors
* 50 academy listings
* 100 open mat listings
* 10 academy claim requests
* 100 map interactions
* 200 search sessions

---

# Target Users

## Practitioner

Needs:

* Find training nearby
* Discover open mats
* Check drop-in costs
* Get directions

---

# MVP Features

## Feature 1: Academy Directory

Users can:

* Browse academies
* Search academies
* Filter academies

Academy Information:

* Name
* Address
* Website
* Contact details
* Affiliation
* Gi availability
* No-Gi availability
* Beginner friendly
* Drop-in available
* Drop-in cost

---

## Feature 2: Open Mat Radar

Primary MVP feature.

Display:

* Today's Open Mats
* Tomorrow's Open Mats
* Weekend Open Mats

Open Mat Information:

* Academy
* Date
* Time
* Gi / No-Gi
* Drop-in cost
* Address

---

## Feature 3: Search

Users can search by:

* Academy name
* Borough
* Postcode
* Gi
* No-Gi

---

## Feature 4: Map

Display:

* Academy locations
* Open mat locations

Functions:

* Directions
* View details

---

## Feature 5: Simple Admin Panel

Single administrator account.

Purpose:

Manage platform content.

Admin Capabilities:

* Create academy
* Edit academy
* Delete academy
* Create open mat
* Edit open mat
* Delete open mat
* Manage users

No role hierarchy required.

No moderation workflow required.

No academy claiming required.

No academy admins required.

---

# Deferred Features

These features are explicitly excluded from MVP.

## Phase 2

* Academy Claiming

---

## Phase 3

* Academy Admins
* RF-010

---

## Phase 4

* Platform Admins
* RF-011

---

## Future

* Reviews
* Messaging
* Billing
* Events
* Seminars
* Competitions

---

# Technology Stack

Frontend:

* Next.js
* React
* TypeScript
* TailwindCSS

Backend:

* Next.js API Routes

Database:

* PostgreSQL

ORM:

* Prisma

Authentication:

* Clerk

---

# Infrastructure Requirements

AWS only.

Infrastructure must be provisioned using Terraform.

Reuse existing Terraform modules.

---

# AWS Architecture

```text
Internet
   │
Route53
   │
ECS Fargate
   │
PostgreSQL
```

Required Services:

* ECS Fargate
* ECR
* PostgreSQL
* Route53
* Secrets Manager

Avoid:

* CloudFront
* WAF
* Multi-AZ
* Complex networking
* Kubernetes
* EKS

---

# Cost Target

Monthly AWS Cost Goal:

```text
ECS Fargate      ~ £12
PostgreSQL       ~ £10
ECR              ~ £1
Secrets Manager  ~ £1
Route53          ~ £1

Total            ~ £25
```

Maximum:

```text
£35/month
```

---

# Repository Structure

```text
rollfinder
│
├── app
├── components
├── features
├── lib
├── tests
│
├── terraform
│   ├── modules
│   └── environments
│
├── docs
│
├── Dockerfile
└── bitbucket-pipelines.yml
```

---

# Terraform Structure

Reuse existing modules.

```text
terraform
│
├── modules
│   ├── ecs
│   ├── ecr
│   ├── s3
│   └── secrets
│
└── environments
    ├── dev
    └── prod
```

Only two environments.

Do not create:

* QA
* UAT
* Integration
* Performance

---

# Deployment Pipeline

Source Control:

Bitbucket

Pipeline:

```text
Pull Request
│
├── Lint
├── Type Check
├── Unit Test
└── Build

Main Branch
│
├── Docker Build
├── Push ECR
├── Terraform Apply
└── ECS Deploy
```

---

# Secrets

All secrets must be passed through environment variables.

No hardcoded credentials.

No secrets in source control.

Use:

AWS Secrets Manager

---

# Environment Variables

```env
DATABASE_URL=

CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

GOOGLE_MAPS_API_KEY=

NEXT_PUBLIC_APP_URL=

AWS_REGION=
```

---

# Database Schema

Core Tables:

## Users

```text
id
email
created_at
```

---

## Academies

```text
id
name
slug
address
postcode
website
phone
affiliation
drop_in_cost
gi_available
nogi_available
created_at
```

---

## Open Mats

```text
id
academy_id
title
start_time
end_time
gi_type
drop_in_cost
created_at
```

---

# Monitoring

Required:

* CloudWatch Logs

Optional:

* Sentry

---

# Testing

Required:

* Unit Tests
* API Tests

Coverage Goal:

70%

Do not spend excessive time on E2E testing during MVP.

---

# AI Agent Instructions

The goal is validation, not scale.

When implementing:

* Prefer simplicity.
* Reuse Terraform modules.
* Minimize AWS cost.
* Avoid premature abstractions.
* Avoid microservices.
* Avoid RBAC systems.
* Avoid multi-admin systems.
* Avoid complex workflows.

Every implementation decision should answer:

> Does this help a BJJ practitioner find a place to train today?

If not, defer it.

Feature Status:

APPROVED FOR MVP IMPLEMENTATION


# Competitive Advantage

RollFinders is not intended to be a generic martial arts directory.

The platform differentiates itself by focusing on:

- Open Mat Discovery
- Location-Based Search
- Nearby Academy Discovery
- Nearby Open Mat Discovery
- BJJ-Specific Search Experience
- Academy Claiming
- Mobile-First Training Discovery

The primary question RollFinders answers is:

> Where can I train today?

rather than:

> Where are martial arts clubs located?