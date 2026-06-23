# Billing Shutdown Service

One-off ECS task for production cost shutdown after the monthly AWS bill exceeds the configured GBP threshold.

This is not a long-running API. The billing event starts the task, the task performs the shutdown sequence, writes structured logs, and exits.

## Shutdown Sequence

1. Set production ECS Application Auto Scaling min and max capacity to `0`.
2. Set the production ECS service desired count to `0`.
3. Wait for the ECS service to drain to `0` running tasks.
4. Create an encrypted manual RDS snapshot when the database is available.
5. Stop the RDS instance without deleting it.
6. Delete the production Application Load Balancer.
7. Delete the production NAT Gateway.
8. Release the NAT Gateway Elastic IP after the NAT Gateway is deleted.

## Configuration

Environment variables:

- `AWS_REGION`, default `eu-west-2`
- `TARGET_ENVIRONMENT`, default `production`; only `production` is accepted
- `PROJECT_NAME`, default `rollfinder`
- `REQUIRE_APPROVAL`, default `true`
- `COST_SHUTDOWN_APPROVED`, required as `true` unless `APPROVAL_STATE=approved`
- `DRY_RUN`, default `true`; set to `false` for real shutdown
- `BILLING_THRESHOLD_GBP`, default `35`
- `BILLING_PERIOD`, optional event metadata
- `AWS_ACCOUNT_ID`, optional event metadata
- `ECS_CLUSTER`, default `rollfinder-production`
- `ECS_SERVICE`, default `web`
- `RDS_INSTANCE_ID`, default `rollfinder-production-postgres`
- `ALB_NAME`, default `rollfinder-production-alb`
- `NAT_GATEWAY_NAME`, default `rollfinder-production-nat`
- `SNAPSHOT_PREFIX`, default `rollfinder-production-postgres-pre-shutdown`
- `TIMEOUT`, default `45m`
- `POLL_INTERVAL`, default `15s`

## Local Dry Run

```sh
cd services/billing-shutdown
COST_SHUTDOWN_APPROVED=true go run ./cmd/shutdown
```

Real shutdown requires AWS credentials and:

```sh
DRY_RUN=false COST_SHUTDOWN_APPROVED=true go run ./cmd/shutdown
```

## IAM Scope

The ECS task role should be limited to:

- ECS service describe and update for the production service.
- Application Auto Scaling scalable target updates for the production ECS service.
- RDS describe, snapshot creation, and stop for the production database.
- ELB describe and delete for the production ALB.
- EC2 NAT Gateway describe/delete and Elastic IP release for the production NAT EIP.
- CloudWatch Logs write permissions for task logs.
