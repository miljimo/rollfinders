CREATE TYPE "CourseActivityType" AS ENUM (
  'WARM_UP',
  'DRILLING',
  'TECHNICAL',
  'ROLLING',
  'SPARRING',
  'COMPETITION',
  'Q_AND_A',
  'BREAK',
  'LUNCH',
  'DINNER',
  'SOCIAL',
  'CUSTOM'
);

CREATE TABLE "course_activities" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "activity_type" "CourseActivityType" NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_activities_course_id_start_time_idx" ON "course_activities"("course_id", "start_time");
CREATE INDEX "course_activities_activity_type_idx" ON "course_activities"("activity_type");

ALTER TABLE "course_activities"
  ADD CONSTRAINT "course_activities_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
