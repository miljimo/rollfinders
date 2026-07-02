#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${DB_HOST:-}" ] && [ -n "${DB_NAME:-}" ]; then
    DATABASE_URL="postgres://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}?sslmode=disable"
    export DATABASE_URL
  else
    echo "DATABASE_URL or DB_HOST/DB_NAME is required for service SQL migrations."
    exit 1
  fi
fi

if [ -d "${APP_ROOT:-/app}" ]; then
  cd "${APP_ROOT:-/app}"
fi

if [ -f apps/backend_api/migrations/authorisation/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/authorisation && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/migrations/users/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/users && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/migrations/payments/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/payments && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -d apps/backend_api/migrations/courses ]; then
  for dir in schema types tables functions procedures; do
    if [ -d "apps/backend_api/migrations/courses/${dir}" ]; then
      for file in apps/backend_api/migrations/courses/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "SET search_path TO courses, public;" -f "${file}"
      done
    fi
  done

  prisma_migrations_finished="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL THEN false ELSE COALESCE((SELECT finished_at IS NOT NULL AND rolled_back_at IS NULL FROM public._prisma_migrations WHERE migration_name = '20260623203000_remove_public_analytics_tables' ORDER BY started_at DESC LIMIT 1), false) END;")"
  if [ "${prisma_migrations_finished}" = "t" ] && [ -d apps/backend_api/migrations/courses/rollfinders ]; then
    for file in apps/backend_api/migrations/courses/rollfinders/*.sql; do
      [ -f "${file}" ] || continue
      psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
    done
  fi

  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "INSERT INTO courses.schema_migrations(version) VALUES ('001_coreSchema') ON CONFLICT (version) DO NOTHING;"
fi

if [ -d apps/backend_api/migrations/booking ]; then
  for dir in schema types tables procedures functions; do
    if [ -d "apps/backend_api/migrations/booking/${dir}" ]; then
      for file in apps/backend_api/migrations/booking/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -f apps/backend_api/migrations/notification/001_coreSchema.sql ]; then
  (cd apps/backend_api/migrations/notification && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
fi

if [ -f apps/backend_api/migrations/analytics/001_coreSchema.sql ]; then
  (cd apps/backend_api/migrations/analytics && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
fi

if [ -f apps/backend_api/migrations/subscriptions/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/subscriptions && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -d apps/backend_api/migrations/wallet ]; then
  if [ -f apps/backend_api/migrations/wallet/001_core_schema.sql ]; then
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f apps/backend_api/migrations/wallet/001_core_schema.sql
  fi
  for dir in tables functions procedures; do
    if [ -d "apps/backend_api/migrations/wallet/${dir}" ]; then
      for file in apps/backend_api/migrations/wallet/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -d apps/backend_api/migrations/transfer ]; then
  if [ -f apps/backend_api/migrations/transfer/001_core_schema.sql ]; then
    (cd apps/backend_api/migrations/transfer && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
  fi
fi

if [ -d apps/backend_api/migrations/organisation ]; then
  for dir in schema tables procedures functions; do
    if [ -d "apps/backend_api/migrations/organisation/${dir}" ]; then
      for file in apps/backend_api/migrations/organisation/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -d apps/backend_api/migrations/academy ]; then
  for dir in schema types tables procedures functions; do
    if [ -d "apps/backend_api/migrations/academy/${dir}" ]; then
      for file in apps/backend_api/migrations/academy/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

echo "Service SQL migrations completed successfully."
