CREATE TYPE "PlatformAdminActivityAction" AS ENUM ('ACADEMY_CREATED', 'OPEN_MAT_CREATED', 'ACADEMY_ADMIN_ACTIVATED');
CREATE TYPE "PlatformAdminActivitySource" AS ENUM ('ACADEMY', 'OPEN_MAT', 'ACADEMY_ADMIN');
CREATE TYPE "PlatformAdminExemptionType" AS ENUM ('TEMPORARY', 'PERMANENT');

CREATE TABLE "platform_admin_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "contribution_opt_in" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_admin_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admin_weekly_targets" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "target_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_admin_weekly_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admin_activity_exemptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "PlatformAdminExemptionType" NOT NULL,
  "reason" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_activity_exemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admin_activity_events" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "action_type" "PlatformAdminActivityAction" NOT NULL,
  "source_type" "PlatformAdminActivitySource" NOT NULL,
  "source_id" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dedupe_key" TEXT NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "platform_admin_activity_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_admin_profiles_user_id_key" ON "platform_admin_profiles"("user_id");
CREATE UNIQUE INDEX "platform_admin_weekly_targets_user_id_key" ON "platform_admin_weekly_targets"("user_id");
CREATE INDEX "platform_admin_activity_exemptions_user_id_type_starts_at_ends_at_idx" ON "platform_admin_activity_exemptions"("user_id", "type", "starts_at", "ends_at");
CREATE INDEX "platform_admin_activity_exemptions_created_by_id_idx" ON "platform_admin_activity_exemptions"("created_by_id");
CREATE UNIQUE INDEX "platform_admin_activity_events_dedupe_key_key" ON "platform_admin_activity_events"("dedupe_key");
CREATE INDEX "platform_admin_activity_events_actor_user_id_occurred_at_idx" ON "platform_admin_activity_events"("actor_user_id", "occurred_at");
CREATE INDEX "platform_admin_activity_events_action_type_occurred_at_idx" ON "platform_admin_activity_events"("action_type", "occurred_at");
CREATE INDEX "platform_admin_activity_events_source_type_source_id_idx" ON "platform_admin_activity_events"("source_type", "source_id");

ALTER TABLE "platform_admin_profiles"
ADD CONSTRAINT "platform_admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_admin_weekly_targets"
ADD CONSTRAINT "platform_admin_weekly_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_admin_activity_exemptions"
ADD CONSTRAINT "platform_admin_activity_exemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_admin_activity_exemptions"
ADD CONSTRAINT "platform_admin_activity_exemptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_admin_activity_events"
ADD CONSTRAINT "platform_admin_activity_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "platform_admin_weekly_targets" ("id", "user_id", "target_count", "updated_at")
VALUES ('platform_admin_default_weekly_target', NULL, 5, CURRENT_TIMESTAMP);
