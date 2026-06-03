# Shared Layer

Shared deployment prepares cross-release infrastructure used by the app rollout flow, currently the environment-scoped ECR repository used by Docker image builds.

Run it with:

```bash
ENVIRONMENT_NAME=dev ./scripts/deploy-shared.sh
```
