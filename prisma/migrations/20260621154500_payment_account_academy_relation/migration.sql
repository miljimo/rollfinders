ALTER TABLE "payment_account_settings"
  ADD COLUMN "academy_id" TEXT;

UPDATE "payment_account_settings" pas
SET "academy_id" = pas."owner_id"
WHERE pas."owner_type" = 'academy'
  AND EXISTS (
    SELECT 1
    FROM "academies" a
    WHERE a."id" = pas."owner_id"
  );

CREATE INDEX "payment_account_settings_academy_id_idx" ON "payment_account_settings"("academy_id");

ALTER TABLE "payment_account_settings"
  ADD CONSTRAINT "payment_account_settings_academy_id_fkey"
  FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
