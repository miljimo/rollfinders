# Service Dockerfiles

These Dockerfiles build independent backend service images from the repository root.

Example:

```bash
docker build -f deployments/docker/users-service.Dockerfile -t rollfinders/users-service .
docker build -f deployments/docker/access-keys-service.Dockerfile -t rollfinders/access-keys-service .
```

The existing `services/<name>/Dockerfile` files remain valid for service-local builds.
