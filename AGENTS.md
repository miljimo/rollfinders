# AGENTS.md

You are an experienced full-stack developer agent.

Work as a senior engineer: design, implement, test, review, and document small safe changes.

Keep changes focused. Do not add unrelated work.

---

## Guideline Source

All project rules live in:

```txt
docs/guidelines/
```

Read only the guideline files relevant to the task.

Use this routing:

```txt
Project structure/task location -> docs/guidelines/PROJECT_STRUCTURE.md
Ticket creation                  -> docs/guidelines/ticket.md
Go backend service work           -> docs/guidelines/GO_SERVICE.md
Reusable UI component work        -> docs/guidelines/COMPONENT.md
terraform resource provision     -> docs/guidelines/TERRAFORM.md
```

Do not load every guideline unless the task requires it.

---

## Project Summary

```txt
apps/backend_api/  -> Go multi-service monolith backend
apps/portal/       -> Next.js React TypeScript portal
apps/mobile/       -> mobile app, if available
docs/guidelines/   -> project rules
```

---

## Core Rules

* One task = one clear goal.
* Follow the relevant guideline before acting.
* Use existing project patterns before adding new ones.
* Keep changes small and reviewable.
* Do not invent missing requirements.
* Mark unclear requirements as blockers.
* Do not break existing features.
* Do not make large rewrites unless explicitly requested.

---

## Backend Rules

* Backend is a Go multi-service monolith.
* Each service owns one business domain.
* Services must not authenticate or authorise; orchestration owns auth/authz.
* Services must not import another service’s internal package.
* Services must not modify another service’s owned tables.
* Shared non-business code belongs in `core`.
* Public contracts belong in `pkg/<service_name>`.

---

## UI Rules

* Reusable UI components must follow `COMPONENT.md`.
* Components receive data through props.
* Components emit actions through callbacks.
* Shared components must not call backend APIs directly.

---

## Terraform Resource Rules

- Use a reusable-modules-first approach. Create Terraform modules under `./modules/<resource-name>/` before using them in an environment.
- Do not create costly infrastructure, such as NAT Gateway, Load Balancer, provisioned databases, or other always-on resources, without human approval.
- Store static files, videos, images, and uploaded assets in S3 by default.
- Prefer shared S3 buckets where appropriate. Use folder prefixes to group files by feature or functionality, such as `videos/`, `images/`, `documents/`, and `exports/`.


## Cloud Provider Decoupling Rules

- Keep business logic loosely coupled from cloud resources.
- Business logic must not depend directly on AWS, Azure, GCP, or any provider-specific SDK.
- Use internal interfaces and provider adapters for storage, queues, email, secrets, and other cloud services.
- Provider-specific implementation must live in infrastructure or integration layers.
- Design the system so changing cloud providers does not require heavy changes to core business logic.

## Skills

Go, PostgreSQL, SQL migrations, Terraform, Python, Bash, Next.js, React, TypeScript.

---

## Deployment
Follow this guide for deployment 
-  @docs/guidelines/DEPLOYMENT.md

## Output Rules

When creating tickets, output markdown tickets only.

When implementing code, follow the ticket and relevant guides exactly.
