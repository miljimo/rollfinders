# RollFinders

RollFinders is a Next.js MVP for finding Brazilian Jiu-Jitsu academies and open mats in London.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL
- Prisma migrations and seed data
- NextAuth credentials provider

## Start the Application with Docker Compose

```bash
cp .env.example .env
docker compose --profile app up --build -d --remove-orphans
```

The `app` profile starts PostgreSQL, applies migrations, and starts the portal,
API gateway, and backend services. Open http://localhost:3000 after the
containers become healthy.

Check container status and follow portal logs:

```bash
docker compose --profile app ps
docker compose logs -f app
```

Restart the stack without rebuilding images:

```bash
docker compose --profile app up -d --remove-orphans
```

Rebuild after source or dependency changes:

```bash
docker compose --profile app up --build -d --remove-orphans
```

Stop the application while retaining local database data:

```bash
docker compose --profile app down
```

Do not add `--volumes` unless the local database data should also be deleted.
If an image build fails while contacting Docker Hub, retry the same build after
connectivity is restored; already-running containers are not removed by a
failed build.

## Run the Portal on the Host

Use this workflow when developing the portal while the database and backend
services continue to run in Compose:

```bash
docker compose --profile app up -d --remove-orphans
docker compose stop app
npm install
npm run db:generate
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Open http://localhost:3000.

## Local Build Scripts

Linux engineers can run the same core checks used by CI:

```bash
./scripts/build.sh
```

Build the production Docker image locally:

```bash
./scripts/docker-build.sh
```

Validate Terraform locally:

```bash
./scripts/terraform-validate.sh
```

If Terraform is not installed, the script downloads the pinned Linux binary into `.bin/`.

Run the full local CI path:

```bash
./scripts/local-ci.sh
```

Seed admin:

- Email: `admin@rollfinder.com`
- Password: `admin`

Deployments also run `npm run ensure-super-admin` after migrations in every environment. Override the default credentials with `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and `SUPER_ADMIN_NAME` in the task environment when needed.

## Docker Compose Profiles

Run only the database:

```bash
docker compose --profile db up -d
```

Run the production application container and database:

```bash
docker compose --profile app up --build -d --remove-orphans
```

The `app` profile starts the complete local service stack described above.

Seed the Docker database when needed:

```bash
docker compose --profile seed up --build seed
```

The seed profile is opt-in because the MVP seed adds open mat events.

Database settings are split into individual variables:

```bash
DB_NAME=rollfinder
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=54322
```

The app and Prisma derive the PostgreSQL connection string from those values. You can still set `DATABASE_URL` directly if a hosted provider gives you a single connection string.

## Deployment

Deployment is handled by Bitbucket Pipelines and Terraform. See `docs/features/Deployment/DeploymentPlatformEnhancement.md` and `terraform/README.md`.

## MVP Coverage

- Academy directory and profiles
- Open mat listings and event detail pages
- Search by academy, city, postcode, and session text
- Map page with Google Maps embed support
- Academy claim requests
- Admin portal with academy CRUD and claim approval/rejection
- Prisma migration, seed data, Docker support, and CI



## Production Local Deployment
```bash
git push origin master
ENVIRONMENT_NAME=production PRODUCTION_APPROVED=true ALLOW_DIRECT_ENV_DEPLOY=true ./scripts/cicd/build.sh
ENVIRONMENT_NAME=production PRODUCTION_APPROVED=true ALLOW_DIRECT_ENV_DEPLOY=true ./scripts/cicd/deploy-environment.sh
```
