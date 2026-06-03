CREATE TYPE "UserEmailStatus" AS ENUM ('VALID', 'INVALID', 'PENDING_VERIFICATION');

CREATE TYPE "OutboundEmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'RETRY_PENDING', 'INVALID_EMAIL', 'PERMANENTLY_FAILED');

ALTER TABLE "users"
ADD COLUMN "email_status" "UserEmailStatus" NOT NULL DEFAULT 'VALID',
ADD COLUMN "email_invalid_reason" TEXT,
ADD COLUMN "email_invalid_at" TIMESTAMP(3);

CREATE TABLE "outbound_emails" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "recipient_email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "text_body" TEXT NOT NULL,
  "html_body" TEXT,
  "status" "OutboundEmailStatus" NOT NULL DEFAULT 'PENDING',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_attempt_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "provider_message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "outbound_emails_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbound_email_status_history" (
  "id" TEXT NOT NULL,
  "outbound_email_id" TEXT NOT NULL,
  "status" "OutboundEmailStatus" NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outbound_email_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invalid_email_addresses" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "email" TEXT NOT NULL,
  "failure_reason" TEXT NOT NULL,
  "failure_count" INTEGER NOT NULL DEFAULT 1,
  "last_failure_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invalid_email_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbound_emails_status_next_attempt_at_idx" ON "outbound_emails"("status", "next_attempt_at");
CREATE INDEX "outbound_emails_recipient_email_idx" ON "outbound_emails"("recipient_email");
CREATE INDEX "outbound_emails_user_id_idx" ON "outbound_emails"("user_id");
CREATE INDEX "outbound_email_status_history_outbound_email_id_idx" ON "outbound_email_status_history"("outbound_email_id");
CREATE INDEX "outbound_email_status_history_status_idx" ON "outbound_email_status_history"("status");
CREATE UNIQUE INDEX "invalid_email_addresses_email_key" ON "invalid_email_addresses"("email");
CREATE INDEX "invalid_email_addresses_user_id_idx" ON "invalid_email_addresses"("user_id");

ALTER TABLE "outbound_emails"
ADD CONSTRAINT "outbound_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "outbound_email_status_history"
ADD CONSTRAINT "outbound_email_status_history_outbound_email_id_fkey" FOREIGN KEY ("outbound_email_id") REFERENCES "outbound_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invalid_email_addresses"
ADD CONSTRAINT "invalid_email_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
