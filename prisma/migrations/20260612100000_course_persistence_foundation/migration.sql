-- Add Course semantics to the existing events table without renaming the table or changing IDs.
CREATE TYPE "CourseType" AS ENUM (
  'OPEN_MAT',
  'TRAINING',
  'SPARRING',
  'SEMINAR',
  'WORKSHOP',
  'COMPETITION',
  'PRIVATE_LESSON'
);

ALTER TABLE "events"
  ADD COLUMN "course_type" "CourseType" NOT NULL DEFAULT 'OPEN_MAT',
  ADD COLUMN "instructor" TEXT,
  ADD COLUMN "contact_email" TEXT,
  ADD COLUMN "contact_phone" TEXT,
  ADD COLUMN "location_name" TEXT,
  ADD COLUMN "address_override" TEXT;

CREATE INDEX "events_course_type_idx" ON "events"("course_type");

-- Verification commands for rollout:
-- SELECT COUNT(*) FROM "events";
-- SELECT "course_type", COUNT(*) FROM "events" GROUP BY "course_type";
-- SELECT COUNT(*) FROM "events" WHERE "course_type" IS NULL;
