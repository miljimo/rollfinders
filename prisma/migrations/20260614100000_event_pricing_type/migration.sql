CREATE TYPE "EventPricingType" AS ENUM ('FIXED', 'FREE', 'DONATION');

ALTER TABLE "events"
  ADD COLUMN "pricing_type" "EventPricingType" NOT NULL DEFAULT 'FIXED';

UPDATE "events"
SET "pricing_type" = 'FREE'
WHERE "price" = 0;
