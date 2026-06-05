CREATE TYPE "ClaimRequesterRole" AS ENUM ('OWNER', 'HEAD_COACH', 'MANAGER', 'STAFF', 'OTHER');
CREATE TYPE "BjjBeltRank" AS ENUM ('WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK', 'CORAL', 'RED', 'OTHER');

ALTER TABLE "claim_requests"
ADD COLUMN "requester_phone" TEXT,
ADD COLUMN "requester_role" "ClaimRequesterRole",
ADD COLUMN "requester_belt_rank" "BjjBeltRank",
ADD COLUMN "requester_belt_stripes" INTEGER,
ADD COLUMN "verification_notes" TEXT,
ADD COLUMN "public_proof_link" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_id" TEXT,
ADD COLUMN "rejection_reason" TEXT,
ADD COLUMN "linked_user_id" TEXT;

UPDATE "claim_requests"
SET
  "requester_role" = 'OTHER',
  "verification_notes" = 'Legacy claim request created before verification evidence was required.'
WHERE "requester_role" IS NULL
   OR "verification_notes" IS NULL;

ALTER TABLE "claim_requests"
ALTER COLUMN "requester_role" SET NOT NULL,
ALTER COLUMN "verification_notes" SET NOT NULL;

CREATE INDEX "claim_requests_academy_id_idx" ON "claim_requests"("academy_id");
CREATE INDEX "claim_requests_academy_email_status_idx" ON "claim_requests"("academy_id", "requester_email", "status");
CREATE INDEX "claim_requests_reviewed_by_id_idx" ON "claim_requests"("reviewed_by_id");
CREATE INDEX "claim_requests_linked_user_id_idx" ON "claim_requests"("linked_user_id");
CREATE UNIQUE INDEX "claim_requests_pending_academy_email_key" ON "claim_requests"("academy_id", "requester_email") WHERE "status" = 'PENDING';

ALTER TABLE "claim_requests"
ADD CONSTRAINT "claim_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "claim_requests"
ADD CONSTRAINT "claim_requests_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
