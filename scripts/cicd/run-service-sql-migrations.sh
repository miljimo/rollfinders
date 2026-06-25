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

if [ -f apps/backend_api/migrations/users/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/users && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/migrations/payments/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/payments && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/migrations/authorisation/001_core_schema.sql ]; then
  (cd apps/backend_api/migrations/authorisation && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/migrations/courses/001_coreSchema.sql ]; then
  (cd apps/backend_api/migrations/courses && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
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
