DROP TABLE IF EXISTS "password_reset_tokens";

ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_status";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_invalid_reason";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_invalid_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at";

DROP TYPE IF EXISTS "UserEmailStatus";
