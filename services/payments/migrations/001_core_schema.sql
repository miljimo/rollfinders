\ir schema/001_payment_schema.sql
SET search_path TO payments, public;

\ir schema/002_schema_migrations.sql
\ir types/001_payment_types.sql
\ir tables/001_payments.sql
\ir tables/002_payment_clients.sql
\ir tables/003_checkouts.sql
\ir tables/004_refunds.sql
\ir tables/005_provider_events.sql
\ir tables/006_idempotency_keys.sql
\ir tables/007_payment_status_history.sql
\ir tables/008_outbox_events.sql
\ir functions/001_paymentGet.sql
\ir functions/002_paymentClientGet.sql
\ir functions/003_checkoutGet.sql
\ir functions/004_paymentHistoryList.sql
\ir functions/005_refundList.sql
\ir functions/006_idempotencyGet.sql
\ir functions/007_providerEventExists.sql
\ir functions/008_platformFeeSettingGet.sql
\ir procedures/001_paymentClientUpsert.sql
\ir procedures/002_paymentInsert.sql
\ir procedures/003_checkoutInsert.sql
\ir procedures/004_paymentTransition.sql
\ir procedures/005_refundInsert.sql
\ir procedures/006_providerEventRecord.sql
\ir procedures/007_idempotencyRecordSave.sql

INSERT INTO schema_migrations(version) VALUES ('001_core_schema')
ON CONFLICT (version) DO NOTHING;
