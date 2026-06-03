CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TABLE "users"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "is_protected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_login_at" TIMESTAMP(3);

UPDATE "users"
SET "status" = CASE WHEN "disabled" THEN 'DISABLED'::"UserStatus" ELSE 'ACTIVE'::"UserStatus" END;

UPDATE "users"
SET "role" = 'SUPER_ADMIN',
    "status" = 'ACTIVE',
    "disabled" = false,
    "is_protected" = true
WHERE "email" = 'admin@rollfinder.local';
