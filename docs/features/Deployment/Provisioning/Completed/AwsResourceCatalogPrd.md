# AWS Resource Catalog PRD

Status: Done

Implementation evidence: this catalog documents the current Terraform and deployment-script AWS resource set.

## Purpose

Document every AWS resource used by RollFinders, what each resource is for, and how it relates to the application, deployment pipeline, or infrastructure control plane.

## Scope

- Runtime application resources.
- Network, DNS, TLS, and traffic resources.
- Data, secrets, email, and observability resources.
- Terraform state and deployment-control resources.
- Resource purpose, ownership, and relationship notes.

## AWS Resource Catalog

| Area | AWS resource | Used for |
| --- | --- | --- |
| DNS | Route 53 public hosted zone lookup | Finds the existing public domain zone used for application DNS and certificate validation. |
| DNS | Route 53 frontend A record | Points the canonical frontend domain to the application load balancer. |
| DNS | Route 53 API A record | Points the prepared API hostname to the application load balancer. |
| DNS | Route 53 `www` A record | Points the production `www` hostname to the load balancer for canonical redirect handling. |
| TLS | ACM certificate | Provides HTTPS certificates for frontend, API, and redirect hostnames. |
| Network | VPC | Isolates each environment network boundary. |
| Network | Internet Gateway | Allows public ingress and egress for public subnets. |
| Network | Public subnets | Host public entry resources such as the ALB and NAT Gateway. |
| Network | Private subnets | Host ECS Fargate tasks without public IP addresses. |
| Network | Database subnets | Host RDS away from direct internet routes. |
| Network | NAT Gateway and Elastic IP | Allow private ECS tasks to reach external services. |
| Security | ALB security group | Allows public HTTP and HTTPS traffic into the load balancer. |
| Security | ECS security group | Allows only ALB traffic to the app container port. |
| Security | Database security group | Allows PostgreSQL traffic only from ECS tasks. |
| Traffic | Application Load Balancer | Public entry point for web and API traffic. |
| Traffic | ALB target group | Routes load balancer traffic to ECS task IPs on port `3000`. |
| Traffic | HTTP listener | Redirects port `80` traffic to HTTPS. |
| Traffic | HTTPS listener | Terminates TLS and forwards requests to ECS. |
| Traffic | WWW redirect rule | Redirects the production `www` hostname to the canonical domain. |
| Compute | ECR repository | Stores Docker images built by the pipeline. |
| Compute | ECR lifecycle policy | Removes older container images to control storage use. |
| Compute | ECS cluster | Hosts the RollFinders Fargate service. |
| Compute | ECS task definition | Defines the web container image, CPU, memory, ports, secrets, and health check. |
| Compute | ECS service | Runs and replaces web tasks behind the ALB. |
| Compute | ECS autoscaling target | Defines the scaling boundary for the web service. |
| Compute | ECS CPU scaling policy | Scales the service based on average CPU target tracking. |
| Data | RDS subnet group | Places PostgreSQL in database subnets. |
| Data | RDS PostgreSQL | Stores application relational data. |
| Secrets | Secrets Manager secret | Stores runtime app values such as `DATABASE_URL`, auth secret, email config, and cron secret. |
| Secrets | Secrets Manager secret version | Holds the current JSON secret values consumed by ECS. |
| Secrets | SSM SecureString parameters | Stores bootstrap super-admin credentials consumed by ECS during startup. |
| Email | SES domain identity | Verifies the application sending domain. |
| Email | SES DNS records | Publishes SPF, DKIM, DMARC, and mail-from records in Route 53. |
| IAM | ECS task role | Allows the application task to call AWS services such as SES. |
| IAM | ECS execution role | Allows ECS to pull ECR images and read Secrets Manager and SSM values. |
| Observability | CloudWatch log group | Stores application container logs from ECS. |
| Assets | S3 assets bucket | Stores private static assets with encryption and versioning. |
| Assets | CloudFront origin access control | Allows CloudFront to read from the private S3 assets bucket. |
| Assets | CloudFront distribution | Serves static assets from S3 through a CDN endpoint. |
| Events | EventBridge bus/module | Provides event infrastructure for future event-driven workflows. |
| State | S3 Terraform artifact bucket | Stores encrypted Terraform remote state, deployment locks, and promotion markers. |
| Deployment control | S3 deployment lock object | Prevents overlapping deployments from running at the same time. |
| Deployment control | S3 promotion marker objects | Records successful image promotion between environments. |

## Requirements

### Catalog Completeness

IF Terraform provisions or consumes an AWS resource for RollFinders, WHEN this PRD is reviewed, THEN the resource SHALL appear in the AWS resource catalog with its purpose.

### Purpose Clarity

IF a resource is listed, WHEN a reader reviews the catalog, THEN the resource purpose SHALL explain what RollFinders uses it for in plain language.

### Relationship Clarity

IF a resource depends on another AWS resource, WHEN the resource is documented, THEN the dependency SHALL be clear from the purpose or surrounding provisioning PRDs.

### Environment Ownership

IF a resource is environment-specific, WHEN it is provisioned, THEN its name or tags SHALL identify the environment.

### Sensitive Resource Handling

IF a resource stores secrets, credentials, logs, state, or database records, WHEN it is documented, THEN the catalog SHALL identify the kind of sensitive data it protects.

## Acceptance Criteria

- The catalog lists all AWS services currently used by Terraform and deployment scripts.
- Each resource has a short purpose written for engineers and operators.
- Runtime, deployment-control, and state resources are documented separately.
- New AWS resources require an update to this PRD or a linked Deployment PRD.
