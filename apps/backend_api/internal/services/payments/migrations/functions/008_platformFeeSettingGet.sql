DROP FUNCTION IF EXISTS payments."platformFeeSettingGet"();
DROP FUNCTION IF EXISTS public."platformFeeSettingGet"();

CREATE OR REPLACE FUNCTION payments."platformFeeSettingGet"()
RETURNS TABLE (
    platform_fee_basis_points integer,
    platform_fee_fixed_minor integer,
    stripe_processing_fee_basis_points integer,
    stripe_processing_fee_fixed_minor integer,
    currency char(3)
)
LANGUAGE sql
STABLE
SET search_path TO payments, public
AS $$
    SELECT
        500 AS platform_fee_basis_points,
        0 AS platform_fee_fixed_minor,
        290 AS stripe_processing_fee_basis_points,
        30 AS stripe_processing_fee_fixed_minor,
        'GBP'::char(3) AS currency;
$$;
