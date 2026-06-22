CREATE OR REPLACE FUNCTION "platformFeeSettingGet"()
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
        COALESCE(platform_fee_basis_points, 500),
        COALESCE(platform_fee_fixed_minor, 0),
        COALESCE(stripe_processing_fee_basis_points, 290),
        COALESCE(stripe_processing_fee_fixed_minor, 30),
        COALESCE(currency, 'GBP')::char(3)
    FROM public.payment_platform_settings
    WHERE id = 'rollfinders'
    LIMIT 1;
$$;
