ALTER TABLE "payment_account_settings"
  DROP COLUMN IF EXISTS "api_key_ciphertext",
  DROP COLUMN IF EXISTS "api_key_last4",
  DROP COLUMN IF EXISTS "api_key_mode";
