CREATE TABLE "academy_claim_reminders" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "recipient_email" TEXT,
    "outbound_email_id" TEXT,
    "idempotency_key" TEXT,
    "status" TEXT NOT NULL,
    "skip_reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'admin_academies',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_claim_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "academy_claim_reminders_academy_id_created_at_idx" ON "academy_claim_reminders"("academy_id", "created_at");
CREATE INDEX "academy_claim_reminders_recipient_email_created_at_idx" ON "academy_claim_reminders"("recipient_email", "created_at");
CREATE INDEX "academy_claim_reminders_status_idx" ON "academy_claim_reminders"("status");
CREATE INDEX "academy_claim_reminders_skip_reason_idx" ON "academy_claim_reminders"("skip_reason");

ALTER TABLE "academy_claim_reminders" ADD CONSTRAINT "academy_claim_reminders_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
