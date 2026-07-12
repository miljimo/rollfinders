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

if [ -f apps/backend_api/internal/services/authorisation/migrations/001_core_schema.sql ]; then
  (cd apps/backend_api/internal/services/authorisation/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/internal/services/users/migrations/001_core_schema.sql ]; then
  (cd apps/backend_api/internal/services/users/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -f apps/backend_api/internal/services/payments/migrations/001_core_schema.sql ]; then
  (cd apps/backend_api/internal/services/payments/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
fi

if [ -d apps/backend_api/internal/services/courses/migrations ]; then
  for dir in schema types tables functions procedures; do
    if [ -d "apps/backend_api/internal/services/courses/migrations/${dir}" ]; then
      for file in apps/backend_api/internal/services/courses/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "SET search_path TO courses, public;" -f "${file}"
      done
    fi
  done

  prisma_migrations_finished="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL THEN false ELSE COALESCE((SELECT finished_at IS NOT NULL AND rolled_back_at IS NULL FROM public._prisma_migrations WHERE migration_name = '20260623203000_remove_public_analytics_tables' ORDER BY started_at DESC LIMIT 1), false) END;")"
  if [ "${prisma_migrations_finished}" = "t" ] && [ -d apps/backend_api/internal/services/courses/migrations/rollfinders ]; then
    for file in apps/backend_api/internal/services/courses/migrations/rollfinders/*.sql; do
      [ -f "${file}" ] || continue
      psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
    done
  fi

  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "INSERT INTO courses.schema_migrations(version) VALUES ('001_coreSchema') ON CONFLICT (version) DO NOTHING;"
fi

if [ -d apps/backend_api/internal/services/booking/migrations ]; then
  for dir in schema types tables procedures functions; do
    if [ -d "apps/backend_api/internal/services/booking/migrations/${dir}" ]; then
      for file in apps/backend_api/internal/services/booking/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -f apps/backend_api/internal/services/notification/migrations/001_coreSchema.sql ]; then
  (cd apps/backend_api/internal/services/notification/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
fi

if [ -f apps/backend_api/internal/services/analytics/migrations/001_coreSchema.sql ]; then
  (cd apps/backend_api/internal/services/analytics/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_coreSchema.sql)
fi

if [ -d apps/backend_api/internal/services/subscriptions/migrations ]; then
  for file in apps/backend_api/internal/services/subscriptions/migrations/*.sql; do
    [ -f "${file}" ] || continue
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
  done
fi

if [ -d apps/backend_api/internal/services/wallet/migrations ]; then
  if [ -f apps/backend_api/internal/services/wallet/migrations/001_core_schema.sql ]; then
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f apps/backend_api/internal/services/wallet/migrations/001_core_schema.sql
  fi
  for dir in tables functions procedures; do
    if [ -d "apps/backend_api/internal/services/wallet/migrations/${dir}" ]; then
      for file in apps/backend_api/internal/services/wallet/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -d apps/backend_api/internal/services/transfer/migrations ]; then
  if [ -f apps/backend_api/internal/services/transfer/migrations/001_core_schema.sql ]; then
    (cd apps/backend_api/internal/services/transfer/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
  fi
fi

if [ -d apps/backend_api/internal/services/pricing/migrations ]; then
  for dir in schema tables functions; do
    if [ -d "apps/backend_api/internal/services/pricing/migrations/${dir}" ]; then
      for file in apps/backend_api/internal/services/pricing/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -d apps/backend_api/internal/services/usage_limits/migrations ]; then
  if [ -f apps/backend_api/internal/services/usage_limits/migrations/001_core_schema.sql ]; then
    (cd apps/backend_api/internal/services/usage_limits/migrations && psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f 001_core_schema.sql)
  fi
fi

if [ -d apps/backend_api/internal/services/organisation/migrations ]; then
  for dir in schema tables procedures functions; do
    if [ -d "apps/backend_api/internal/services/organisation/migrations/${dir}" ]; then
      for file in apps/backend_api/internal/services/organisation/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

if [ -d apps/backend_api/internal/services/academy/migrations ]; then
  for dir in schema types tables procedures functions; do
    if [ -d "apps/backend_api/internal/services/academy/migrations/${dir}" ]; then
      for file in apps/backend_api/internal/services/academy/migrations/${dir}/*.sql; do
        [ -f "${file}" ] || continue
        psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
      done
    fi
  done
fi

echo "Service SQL migrations completed successfully."
