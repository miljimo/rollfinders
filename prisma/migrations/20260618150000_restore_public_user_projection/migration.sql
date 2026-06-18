CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "Role" NOT NULL DEFAULT 'STANDARD_USER',
  "academy_id" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "is_protected" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_academy_id_idx" ON "users"("academy_id");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_academy_id_fkey'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_academy_id_fkey"
      FOREIGN KEY ("academy_id") REFERENCES "academies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regnamespace('users') IS NOT NULL
     AND to_regclass('users.users') IS NOT NULL
     AND to_regclass('users.credentials') IS NOT NULL
     AND to_regclass('users.user_roles') IS NOT NULL
     AND to_regclass('users.organisation_users') IS NOT NULL THEN
    WITH raw_service_projection AS (
      SELECT
        service_users.id,
        COALESCE(service_credentials.credential_identifier, service_users.external_id, service_users.id || '@rollfinder.local') AS email,
        NULLIF(TRIM(COALESCE(service_users.display_name, CONCAT_WS(' ', service_users.first_name, service_users.last_name))), '') AS name,
        COALESCE(service_roles.role_key::public."Role", 'STANDARD_USER'::public."Role") AS role,
        academies.id AS academy_id,
        COALESCE(service_users.status::text::public."UserStatus", 'ACTIVE'::public."UserStatus") AS status,
        service_users.disabled,
        service_users.is_protected,
        service_users.created_at,
        service_users.updated_at
      FROM users.users service_users
      LEFT JOIN LATERAL (
        SELECT credentials.credential_identifier
        FROM users.credentials credentials
        WHERE credentials.user_id = service_users.id
          AND credentials.credential_type = 'EMAIL_PASSWORD'
        ORDER BY credentials.created_at ASC
        LIMIT 1
      ) service_credentials ON true
      LEFT JOIN LATERAL (
        SELECT user_roles.role_key
        FROM users.user_roles user_roles
        WHERE user_roles.user_id = service_users.id
        ORDER BY user_roles.created_at ASC
        LIMIT 1
      ) service_roles ON true
      LEFT JOIN LATERAL (
        SELECT organisation_users.organisation_id
        FROM users.organisation_users organisation_users
        WHERE organisation_users.user_id = service_users.id
        ORDER BY organisation_users.created_at ASC
        LIMIT 1
      ) service_organisations ON true
      LEFT JOIN public.academies academies ON academies.id = service_organisations.organisation_id
    ),
    service_projection AS (
      SELECT DISTINCT ON (raw_service_projection.email)
        raw_service_projection.*
      FROM raw_service_projection
      ORDER BY raw_service_projection.email, raw_service_projection.created_at ASC, raw_service_projection.id ASC
    )
    UPDATE public."users" existing_users
    SET
      "name" = service_projection.name,
      "role" = service_projection.role,
      "academy_id" = COALESCE(existing_users."academy_id", service_projection.academy_id),
      "status" = service_projection.status,
      "disabled" = service_projection.disabled,
      "is_protected" = service_projection.is_protected,
      "updated_at" = service_projection.updated_at
    FROM service_projection
    WHERE existing_users."id" = service_projection.id
       OR existing_users."email" = service_projection.email;

    WITH service_projection AS (
      SELECT
        service_users.id,
        COALESCE(service_credentials.credential_identifier, service_users.external_id, service_users.id || '@rollfinder.local') AS email,
        NULLIF(TRIM(COALESCE(service_users.display_name, CONCAT_WS(' ', service_users.first_name, service_users.last_name))), '') AS name,
        COALESCE(service_roles.role_key::public."Role", 'STANDARD_USER'::public."Role") AS role,
        academies.id AS academy_id,
        COALESCE(service_users.status::text::public."UserStatus", 'ACTIVE'::public."UserStatus") AS status,
        service_users.disabled,
        service_users.is_protected,
        service_users.created_at,
        service_users.updated_at
      FROM users.users service_users
      LEFT JOIN LATERAL (
        SELECT credentials.credential_identifier
        FROM users.credentials credentials
        WHERE credentials.user_id = service_users.id
          AND credentials.credential_type = 'EMAIL_PASSWORD'
        ORDER BY credentials.created_at ASC
        LIMIT 1
      ) service_credentials ON true
      LEFT JOIN LATERAL (
        SELECT user_roles.role_key
        FROM users.user_roles user_roles
        WHERE user_roles.user_id = service_users.id
        ORDER BY user_roles.created_at ASC
        LIMIT 1
      ) service_roles ON true
      LEFT JOIN LATERAL (
        SELECT organisation_users.organisation_id
        FROM users.organisation_users organisation_users
        WHERE organisation_users.user_id = service_users.id
        ORDER BY organisation_users.created_at ASC
        LIMIT 1
      ) service_organisations ON true
      LEFT JOIN public.academies academies ON academies.id = service_organisations.organisation_id
    )
    INSERT INTO public."users" (
      "id",
      "email",
      "name",
      "role",
      "academy_id",
      "status",
      "disabled",
      "is_protected",
      "created_at",
      "updated_at"
    )
    SELECT
      service_projection.id,
      service_projection.email,
      service_projection.name,
      service_projection.role,
      service_projection.academy_id,
      service_projection.status,
      service_projection.disabled,
      service_projection.is_protected,
      service_projection.created_at,
      service_projection.updated_at
    FROM service_projection
    WHERE NOT EXISTS (
      SELECT 1
      FROM public."users" existing_users
      WHERE existing_users."id" = service_projection.id
         OR existing_users."email" = service_projection.email
    );
  END IF;
END $$;
