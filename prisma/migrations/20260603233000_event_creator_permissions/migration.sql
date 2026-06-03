ALTER TABLE "events"
ADD COLUMN "created_by_id" TEXT;

CREATE INDEX "events_academy_id_idx" ON "events"("academy_id");
CREATE INDEX "events_created_by_id_idx" ON "events"("created_by_id");

ALTER TABLE "events"
ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
