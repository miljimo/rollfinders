ALTER TABLE "payment_platform_settings"
  ADD COLUMN IF NOT EXISTS "stripe_processing_fee_basis_points" INTEGER NOT NULL DEFAULT 290,
  ADD COLUMN IF NOT EXISTS "stripe_processing_fee_fixed_minor" INTEGER NOT NULL DEFAULT 30;

UPDATE "payment_platform_settings"
SET
  "stripe_processing_fee_basis_points" = COALESCE("stripe_processing_fee_basis_points", 290),
  "stripe_processing_fee_fixed_minor" = COALESCE("stripe_processing_fee_fixed_minor", 30),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'rollfinders';
