# Application Deployment Layer

Application deployment is the runtime rollout path after the Docker image exists. It uses the prepared image URI and updates the app stack through the CI deployment script.

Run it with:

```bash
ENVIRONMENT_NAME=dev IMAGE_URI=<account>.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/dev/app:<tag> ./scripts/deploy.sh
```

For full promotion checks, deployment locking, migrations, seeding, and smoke tests, use `./scripts/deploy-environment.sh`.
