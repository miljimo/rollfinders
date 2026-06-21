ALTER TABLE "payment_account_settings"
  ADD COLUMN "api_key_ciphertext" TEXT,
  ADD COLUMN "api_key_last4" TEXT,
  ADD COLUMN "api_key_mode" TEXT;
