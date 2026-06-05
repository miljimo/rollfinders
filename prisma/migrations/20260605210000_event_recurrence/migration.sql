CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'YEARLY');

ALTER TABLE "events"
  ADD COLUMN "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recurrence_end_date" TIMESTAMP(3),
  ADD COLUMN "recurrence_limit" INTEGER;

CREATE INDEX "events_recurrence_type_idx" ON "events"("recurrence_type");
CREATE INDEX "events_recurrence_end_date_idx" ON "events"("recurrence_end_date");
