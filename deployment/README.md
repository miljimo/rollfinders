# Application Deployment

This layer is the application-only rollout path. It updates the ECS task definition and service to the Docker image built by CI, then waits for service stability.

Run it with:

```bash
ENVIRONMENT_NAME=dev ./scripts/deploy.sh
```

It does not run `terraform plan` or `terraform apply`, so it does not evaluate VPC, Route53, NAT, ACM, subnets, or backend resources.
