CREATE TABLE IF NOT EXISTS subscriptions.plan_feature_products (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    feature_id text NOT NULL REFERENCES subscriptions.product_features(id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES subscriptions.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(feature_id, product_id)
);

INSERT INTO subscriptions.plan_feature_products (feature_id, product_id)
SELECT id, product_id
FROM subscriptions.product_features
ON CONFLICT (feature_id, product_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS subscriptions_plan_feature_products_feature_idx
    ON subscriptions.plan_feature_products(feature_id);

CREATE INDEX IF NOT EXISTS subscriptions_plan_feature_products_product_idx
    ON subscriptions.plan_feature_products(product_id);
