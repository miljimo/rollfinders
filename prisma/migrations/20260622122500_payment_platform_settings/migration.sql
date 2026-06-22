CREATE TABLE "payment_platform_settings" (
  "id" TEXT NOT NULL,
  "platform_fee_basis_points" INTEGER NOT NULL DEFAULT 500,
  "platform_fee_fixed_minor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_platform_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "payment_platform_settings" (
  "id",
  "platform_fee_basis_points",
  "platform_fee_fixed_minor",
  "currency",
  "updated_at"
)
VALUES (
  'rollfinders',
  500,
  0,
  'GBP',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
