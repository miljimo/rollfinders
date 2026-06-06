ALTER TABLE "academies" ADD COLUMN "created_by_id" TEXT;

CREATE INDEX "academies_created_by_id_idx" ON "academies"("created_by_id");

ALTER TABLE "academies"
ADD CONSTRAINT "academies_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
