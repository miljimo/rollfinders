# RollFinders

RollFinders is a Next.js MVP for finding Brazilian Jiu-Jitsu academies and open mats in London.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL
- Prisma migrations and seed data
- NextAuth credentials provider

## Local Setup

```bash
cp .env.example .env
docker compose --profile db up -d
npm install
npm run db:generate
npm run db:dev
npm run db:seed
npm run dev
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
docker compose --profile app up --build
```

The `app` profile starts Postgres, waits for it to become healthy, runs Prisma migrations, and then starts Next.js at http://localhost:3000.

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