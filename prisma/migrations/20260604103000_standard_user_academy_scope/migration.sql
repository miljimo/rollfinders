ALTER TABLE "users" ADD COLUMN "academy_id" TEXT;

UPDATE "users" AS user_record
SET "academy_id" = member_scope."academy_id"
FROM (
  SELECT DISTINCT ON ("user_id") "user_id", "academy_id"
  FROM "academy_members"
  ORDER BY "user_id", "created_at" ASC
) AS member_scope
WHERE user_record."id" = member_scope."user_id"
  AND user_record."academy_id" IS NULL
  AND user_record."role" IN ('USER', 'STANDARD_USER', 'ACADEMY_OWNER');

CREATE INDEX "users_academy_id_idx" ON "users"("academy_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
