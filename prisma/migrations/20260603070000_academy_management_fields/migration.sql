CREATE TYPE "AcademyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "academies"
ADD COLUMN "cover_image_url" TEXT,
ADD COLUMN "categories" TEXT,
ADD COLUMN "facebook_url" TEXT,
ADD COLUMN "instagram_url" TEXT,
ADD COLUMN "x_url" TEXT,
ADD COLUMN "verification_status" "AcademyVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

UPDATE "academies"
SET "verification_status" = CASE WHEN "verified" = true THEN 'VERIFIED'::"AcademyVerificationStatus" ELSE 'PENDING'::"AcademyVerificationStatus" END;

CREATE INDEX "academies_name_idx" ON "academies"("name");
CREATE INDEX "academies_verification_status_idx" ON "academies"("verification_status");
CREATE INDEX "academies_featured_idx" ON "academies"("featured");
CREATE INDEX "academies_created_at_idx" ON "academies"("created_at");
CREATE INDEX "academies_updated_at_idx" ON "academies"("updated_at");
