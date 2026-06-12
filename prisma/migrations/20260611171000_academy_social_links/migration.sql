CREATE TYPE "AcademySocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE', 'TIKTOK', 'LINKEDIN', 'WEBSITE', 'OTHER');

CREATE TABLE "academy_social_links" (
  "id" TEXT NOT NULL,
  "academy_id" TEXT NOT NULL,
  "platform" "AcademySocialPlatform" NOT NULL,
  "url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "academy_social_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academy_social_links_academy_id_platform_key" ON "academy_social_links"("academy_id", "platform");
CREATE INDEX "academy_social_links_academy_id_idx" ON "academy_social_links"("academy_id");

ALTER TABLE "academy_social_links"
ADD CONSTRAINT "academy_social_links_academy_id_fkey"
FOREIGN KEY ("academy_id") REFERENCES "academies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "academy_social_links" ("id", "academy_id", "platform", "url", "updated_at")
SELECT 'legacy-facebook-' || "id", "id", 'FACEBOOK'::"AcademySocialPlatform", "facebook_url", CURRENT_TIMESTAMP
FROM "academies"
WHERE "facebook_url" IS NOT NULL AND btrim("facebook_url") <> '';

INSERT INTO "academy_social_links" ("id", "academy_id", "platform", "url", "updated_at")
SELECT 'legacy-instagram-' || "id", "id", 'INSTAGRAM'::"AcademySocialPlatform", "instagram_url", CURRENT_TIMESTAMP
FROM "academies"
WHERE "instagram_url" IS NOT NULL AND btrim("instagram_url") <> '';

INSERT INTO "academy_social_links" ("id", "academy_id", "platform", "url", "updated_at")
SELECT 'legacy-x-' || "id", "id", 'X'::"AcademySocialPlatform", "x_url", CURRENT_TIMESTAMP
FROM "academies"
WHERE "x_url" IS NOT NULL AND btrim("x_url") <> '';
