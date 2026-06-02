CREATE TYPE "Role" AS ENUM ('USER', 'ACADEMY_OWNER', 'ADMIN');
CREATE TYPE "GiType" AS ENUM ('GI', 'NO_GI', 'BOTH');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "affiliation" TEXT,
  "website" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postcode" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'United Kingdom',
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "logo_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
  "id" TEXT NOT NULL,
  "academy_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "event_date" TIMESTAMP(3) NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "gi_type" "GiType" NOT NULL,
  "price" DECIMAL(8,2) NOT NULL,
  "capacity" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claim_requests" (
  "id" TEXT NOT NULL,
  "academy_id" TEXT NOT NULL,
  "requester_name" TEXT NOT NULL,
  "requester_email" TEXT NOT NULL,
  "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "claim_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "academies_slug_key" ON "academies"("slug");
CREATE INDEX "academies_city_idx" ON "academies"("city");
CREATE INDEX "academies_postcode_idx" ON "academies"("postcode");
CREATE INDEX "events_event_date_idx" ON "events"("event_date");
CREATE INDEX "claim_requests_status_idx" ON "claim_requests"("status");

ALTER TABLE "events" ADD CONSTRAINT "events_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
