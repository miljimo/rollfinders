# Billing Threshold Shutdown PRD

## Purpose

Protect the project from runaway AWS spend by automatically escalating and safely shutting down production-cost resources when the monthly bill exceeds GBP 35.

## Scope

- Monthly AWS cost monitoring.
- Billing threshold alerting.
- Event-triggered ECS shutdown task orchestration.
- Data-preserving database stop.
- Deletion of high-idle-cost network entry resources.
- Recovery visibility for future redeploys.

## Requirements

### Billing Threshold Detection

IF the current calendar-month AWS bill for RollFinders exceeds GBP 35, WHEN the billing monitor evaluates cost, THEN it must raise a high-priority cost incident.

AND the monitor SHALL use the best available AWS billing source, such as AWS Budgets, Cost Explorer, or Billing and Cost Management alerts.

AND the threshold comparison SHALL account for currency conversion if AWS reports the account bill in a non-GBP currency.

### Event-Triggered Shutdown Runner

IF the billing threshold event is emitted, WHEN automation is enabled, THEN the event must start a one-off ECS task that runs the shutdown workflow.

AND the ECS task SHALL be task-based rather than a continuously running service.

AND the ECS task SHALL exit after it reports shutdown success or failure.

AND the ECS task SHALL run outside the production application ECS service so that stopping production application tasks does not stop the shutdown runner.

AND the ECS task SHALL have an IAM task role limited to the AWS actions required for cost shutdown, including ECS service scaling, Application Auto Scaling target updates, RDS snapshot and stop operations, ELB deletion, NAT Gateway deletion, Elastic IP release, and read-only status verification.

AND the event source SHALL pass the billing threshold, billing period, account ID, target environment, and approval state into the ECS task.

AND the ECS task SHALL write structured logs to CloudWatch Logs for audit and recovery.

### Shutdown Authorization

IF the billing threshold is exceeded, WHEN a shutdown workflow is started, THEN it must require explicit production authorization before making changes.

AND the authorization prompt SHALL summarize the resources that will be stopped, deleted, retained, and left billing.

AND if fully automatic shutdown is enabled, THEN the approval state SHALL be represented by configuration that is visible in Terraform or deployment settings.

### Kill Services First

IF production shutdown is authorized, WHEN the workflow begins, THEN it must stop application traffic and compute before changing data resources.

AND the workflow SHALL set ECS service autoscaling minimum capacity to `0`.

AND the workflow SHALL set ECS service autoscaling maximum capacity to `0`.

AND the workflow SHALL set the production ECS service desired count to `0`.

AND the workflow SHALL wait until the ECS service has `0` running tasks before moving to database actions.

### Preserve Database Data

IF the database is still available, WHEN compute has been stopped, THEN the workflow must create a manual encrypted RDS snapshot before stopping the database.

AND the workflow SHALL wait until the snapshot is available before issuing the database stop request.

AND the workflow SHALL stop the RDS instance rather than delete it.

AND the workflow SHALL leave RDS deletion protection enabled.

### Stop High Idle-Cost Network Resources

IF production compute is stopped and database data is protected, WHEN the workflow continues cost reduction, THEN it may delete high idle-cost network resources that can be recreated by Terraform.

AND the workflow SHALL delete the production Application Load Balancer.

AND the workflow SHALL delete the production NAT Gateway.

AND the workflow SHALL release the NAT Gateway Elastic IP only after the NAT Gateway reaches the deleted state.

AND the workflow SHALL not delete VPCs, subnets, route tables, security groups, DNS records, certificates, S3 buckets, RDS snapshots, ECR repositories, CloudWatch logs, SSM parameters, or Terraform state unless a separate destruction workflow is explicitly approved.

### Retained Cost Visibility

IF shutdown completes, WHEN the workflow reports status, THEN it must list resources that may continue to bill.

The retained-cost report SHALL include RDS storage, RDS snapshots, S3 storage, ECR image storage, CloudWatch logs, Route 53 hosted zones, CloudFront usage, SSM advanced parameters if present, and any orphaned Elastic IPs.

### Terraform Drift Notice

IF Terraform-managed resources are manually deleted for cost control, WHEN the shutdown report is generated, THEN it must state that Terraform state still expects those resources.

AND the report SHALL explain that a future deploy or `terraform apply` may recreate deleted resources.

### Recovery

IF operators need to restore production, WHEN recovery starts, THEN the workflow must identify the most recent pre-shutdown RDS snapshot and the resources Terraform must recreate.

AND recovery documentation SHALL include the expected ECS service, RDS instance, ALB, NAT Gateway, and Elastic IP states before redeployment.

### Runner Completion

IF the ECS shutdown task completes, WHEN it exits, THEN no shutdown runner container should remain running.

AND failed shutdown attempts SHALL leave enough CloudWatch log context to identify the last successful step and the resource that blocked progress.

## Acceptance Criteria

- A GBP 35 monthly billing threshold can trigger a documented production cost incident.
- The billing event can start a one-off ECS shutdown task.
- The ECS shutdown task exits after completion and does not run continuously.
- Production shutdown cannot run silently without explicit authorization.
- ECS tasks are killed before the database is stopped.
- RDS data is preserved by an available encrypted manual snapshot before stop.
- RDS is stopped, not deleted.
- ALB, NAT Gateway, and NAT Elastic IP are removed only after data-preserving shutdown steps complete.
- The shutdown report clearly separates deleted, stopped, and retained resources.
- Remaining billable resources are visible for follow-up cleanup.
- Terraform drift caused by manual deletion is documented for recovery.
