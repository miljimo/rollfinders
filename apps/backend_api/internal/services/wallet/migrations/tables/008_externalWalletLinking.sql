ALTER TABLE wallet.wallets
    DROP CONSTRAINT IF EXISTS wallets_status_check;

ALTER TABLE wallet.wallets
    ADD CONSTRAINT wallets_status_check CHECK (status IN ('active', 'inactive', 'frozen', 'suspended', 'closed'));

UPDATE wallet.wallets w
SET status = 'inactive',
    updated_at = now()
WHERE w.wallet_type = 'external'
  AND w.status = 'active'
  AND NOT EXISTS (
      SELECT 1
      FROM wallet.linked_wallet_accounts a
      WHERE a.wallet_id = w.id
        AND a.status = 'CONNECTED'
  );
