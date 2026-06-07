-- CreateEnum
CREATE TYPE "EmailDeliveryJobRunStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "email_delivery_job_runs" (
    "id" TEXT NOT NULL,
    "status" "EmailDeliveryJobRunStatus" NOT NULL,
    "trigger_source" TEXT NOT NULL,
    "triggered_by_user_id" TEXT,
    "triggered_by_email" TEXT,
    "requested_limit" INTEGER NOT NULL,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "retry_pending_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "email_delivery_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_delivery_job_runs_started_at_idx" ON "email_delivery_job_runs"("started_at");

-- CreateIndex
CREATE INDEX "email_delivery_job_runs_status_started_at_idx" ON "email_delivery_job_runs"("status", "started_at");

-- CreateIndex
CREATE INDEX "email_delivery_job_runs_triggered_by_user_id_idx" ON "email_delivery_job_runs"("triggered_by_user_id");
