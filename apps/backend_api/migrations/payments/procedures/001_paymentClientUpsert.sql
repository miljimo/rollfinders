CREATE OR REPLACE PROCEDURE "paymentClientUpsert"(
    p_id text,
    p_name text,
    p_callback_url text
)
LANGUAGE plpgsql
SET search_path TO payments, public
AS $$
BEGIN
    INSERT INTO payment_clients (id, name, callback_url)
    VALUES (p_id, p_name, p_callback_url)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        callback_url = EXCLUDED.callback_url;
END;
$$;
