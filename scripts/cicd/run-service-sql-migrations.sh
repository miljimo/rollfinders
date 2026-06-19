#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required for service SQL migrations."
  exit 1
fi

cd /app

if [ -f services/users/migrations/001_core_schema.sql ]; then
  (cd services/users/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f services/payments/migrations/001_core_schema.sql ]; then
  (cd services/payments/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f services/courses/migrations/001_coreSchema.sql ]; then
  (cd services/courses/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
fi

echo "Service SQL migrations completed successfully."
