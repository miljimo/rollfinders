# RollFinder

RollFinder is a Next.js MVP for finding Brazilian Jiu-Jitsu academies and open mats in London.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase-hosted PostgreSQL and storage-ready client
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

Seed admin:

- Email: `admin@rollfinder.local`
- Password: `rollfinder-admin`

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

## Supabase

Create a Supabase project, copy the database connection details into `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`, then set `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If Supabase gives you a pooled connection string, you can set `DATABASE_URL` instead. Supabase Storage is ready to use through `src/lib/supabase.ts`.

## Deployment

Set the environment variables from `.env.example` in Vercel, then run:

```bash
npm run db:migrate
npm run db:seed
```

## MVP Coverage

- Academy directory and profiles
- Open mat listings and event detail pages
- Search by academy, city, postcode, and session text
- Map page with Google Maps embed support
- Academy claim requests
- Admin portal with academy CRUD and claim approval/rejection
- Prisma migration, seed data, Docker support, and CI
