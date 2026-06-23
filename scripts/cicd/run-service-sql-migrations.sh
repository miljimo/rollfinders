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

cd /app

if [ -f services/users/migrations/001_core_schema.sql ]; then
  (cd services/users/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f services/payments/migrations/001_core_schema.sql ]; then
  (cd services/payments/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f services/authorisation/migrations/001_core_schema.sql ]; then
  (cd services/authorisation/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f services/courses/migrations/001_coreSchema.sql ]; then
  (cd services/courses/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
fi

if [ -d services/booking/migrations ]; then
  for dir in schema types tables procedures functions; do
    if [ -d "services/booking/migrations/${dir}" ]; then
      for file in services/booking/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -d services/academy/migrations ]; then
  for dir in schema types tables procedures functions; do
    if [ -d "services/academy/migrations/${dir}" ]; then
      for file in services/academy/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

echo "Service SQL migrations completed successfully."
