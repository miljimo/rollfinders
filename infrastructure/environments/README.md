# Environment Layer

Environment deployment owns long-lived runtime infrastructure for `dev`, `staging`, and `production`:

- networking, ALB, DNS, and certificate wiring
- ECS service, RDS, Secrets Manager, CloudFront assets, EventBridge
- environment-specific capacity and retention settings

Run it with:

```bash
ENVIRONMENT_NAME=dev ./scripts/deploy-environment.sh
```
