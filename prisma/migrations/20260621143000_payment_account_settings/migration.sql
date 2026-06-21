CREATE TABLE "payment_account_settings" (
  "id" TEXT NOT NULL,
  "owner_type" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "provider_account_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
  "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_account_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_account_settings_owner_type_owner_id_provider_key" ON "payment_account_settings"("owner_type", "owner_id", "provider");
CREATE INDEX "payment_account_settings_owner_type_owner_id_idx" ON "payment_account_settings"("owner_type", "owner_id");
CREATE INDEX "payment_account_settings_provider_account_id_idx" ON "payment_account_settings"("provider_account_id");
